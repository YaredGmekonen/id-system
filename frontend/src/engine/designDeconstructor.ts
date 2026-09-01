/**
 * SiliconLabs AI Template Deconstructor — Hybrid Pipeline v3
 * 
 * Uses a single Gemini Vision API call to extract structured layout
 * from any uploaded card design, then local pixel math for precise
 * colors, font sizes, and background reconstruction.
 * 
 * The Deconstructor extracts DESIGN STRUCTURE (positions, sizes, types, 
 * field bindings) — NOT per-record data. That's the Digitizer's job.
 * 
 * Front and Back sides run independently through the full pipeline.
 */

import type { CanvasElement } from '../db/database';
import { callGeminiVision, parseDataUrl, stripJsonFences } from './geminiClient';

// =====================================================================
// TYPES — kept identical for ImportAnalysisModal compatibility
// =====================================================================

export interface DeconstructedField {
  id: string;
  originalText: string;
  label: string;
  sampleValue: string;
  suggestedBinding: string;
  replacementText: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number }; // Target canvas pixels
  fontSize: number;
  fontColor: string;
  fontWeight: 'normal' | 'bold';
  type: 'text' | 'photo' | 'barcode' | 'qr' | 'header';
  isCircle?: boolean;
  selected: boolean;
}

export interface RawOcrLine {
  index: number;
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  classification: 'bound-field' | 'header-or-text' | 'discarded-overlap' | 'discarded-too-small' | 'label' | 'photo' | 'code' | 'logo' | 'decorative';
  ruleMatched?: string;
  suggestedBinding?: string;
}

export interface DeconstructionResult {
  cleanedBackgroundUrl: string;
  originalImageUrl: string;
  widthPx: number;
  heightPx: number;
  side: 'front' | 'back';
  fields: DeconstructedField[];
  generatedLayers: CanvasElement[];
  rawOcrLines: RawOcrLine[];
  debugLog: string[];
  photoDetected: boolean;
  codeDetected: boolean;
}

// =====================================================================
// Gemini Vision API Types
// =====================================================================

interface GeminiLayoutElement {
  type: 'text_label' | 'text_value' | 'photo' | 'code' | 'logo' | 'decorative';
  content: string;
  bbox: [number, number, number, number]; // [y_min, x_min, y_max, x_max] 0-1000
  suggested_field: string | null;
  is_per_person: boolean;
}

interface GeminiLayoutResponse {
  elements: GeminiLayoutElement[];
}

// =====================================================================
// CONSTANTS
// =====================================================================



/** Maps Gemini's suggested_field values to our {{binding}} tokens */
const FIELD_BINDING_MAP: Record<string, string> = {
  full_name: '{{full_name}}',
  first_name: '{{first_name}}',
  last_name: '{{last_name}}',
  id_number: '{{id_number}}',
  dob: '{{dob}}',
  date_of_birth: '{{dob}}',
  address: '{{address}}',
  department: '{{department}}',
  grade: '{{department}}',
  class: '{{department}}',
  role: '{{role}}',
  title: '{{role}}',
  designation: '{{role}}',
  phone: '{{phone}}',
  mobile: '{{phone}}',
  email: '{{email}}',
  blood_group: '{{blood_group}}',
  blood_type: '{{blood_group}}',
  joined_date: '{{joined_date}}',
  issue_date: '{{joined_date}}',
  valid_until: '{{joined_date}}',
  expiry: '{{joined_date}}',
  academic_year: '{{joined_date}}',
  status: '{{status}}',
  photo: '{{photo}}',
  qr_code: '{{qr_code}}',
  barcode: '{{barcode}}',
  gender: '{{status}}',
  section: '{{department}}',
  parent_name: '{{full_name}}',
  guardian: '{{full_name}}',
  emergency_phone: '{{phone}}',
};

// =====================================================================
// PIXEL MATH UTILITIES — kept from original, proven reliable
// =====================================================================

/**
 * Samples the dominant background edge color surrounding a bounding box.
 */
function sampleSurroundingBgColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number
): { r: number; g: number; b: number; a: number; hex: string } {
  const points: { x: number; y: number }[] = [];
  const offset = 4;

  for (let px = x; px <= x + w; px += Math.max(1, Math.floor(w / 6))) {
    if (y - offset >= 0) points.push({ x: px, y: y - offset });
    if (y + h + offset < canvasH) points.push({ x: px, y: y + h + offset });
  }

  for (let py = y; py <= y + h; py += Math.max(1, Math.floor(h / 4))) {
    if (x - offset >= 0) points.push({ x: x - offset, y: py });
    if (x + w + offset < canvasW) points.push({ x: x + w + offset, y: py });
  }

  if (points.length === 0) {
    return { r: 255, g: 255, b: 255, a: 255, hex: '#FFFFFF' };
  }

  let totalR = 0, totalG = 0, totalB = 0, count = 0;
  for (const pt of points) {
    try {
      const p = ctx.getImageData(Math.min(canvasW - 1, Math.max(0, pt.x)), Math.min(canvasH - 1, Math.max(0, pt.y)), 1, 1).data;
      totalR += p[0];
      totalG += p[1];
      totalB += p[2];
      count++;
    } catch {
      // ignore
    }
  }

  if (count === 0) return { r: 255, g: 255, b: 255, a: 255, hex: '#FFFFFF' };

  const avgR = Math.round(totalR / count);
  const avgG = Math.round(totalG / count);
  const avgB = Math.round(totalB / count);
  const hex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;

  return { r: avgR, g: avgG, b: avgB, a: 255, hex };
}

/**
 * Masks strictly the claimed bounding box on the background raster layer.
 */
function maskClaimedRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number,
  canvasH: number,
  isCircle: boolean = false
) {
  const bg = sampleSurroundingBgColor(ctx, x, y, w, h, canvasW, canvasH);
  ctx.save();
  ctx.fillStyle = bg.hex;

  if (isCircle) {
    ctx.beginPath();
    const cx = x + w / 2;
    const cy = y + h / 2;
    const radius = Math.min(w, h) / 2;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }

  ctx.restore();
}

/**
 * Samples average text color inside a bounding box
 * Uses dark-pixel vs bright-pixel clustering to find the actual ink color
 */
function sampleTextColor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): string {
  try {
    const sw = Math.max(1, Math.min(w, 40));
    const sh = Math.max(1, Math.min(h, 20));
    const imgData = ctx.getImageData(x, y, sw, sh);
    const data = imgData.data;

    let darkR = 0, darkG = 0, darkB = 0, darkCount = 0;
    let brightR = 0, brightG = 0, brightB = 0, brightCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r * 299 + g * 587 + b * 114) / 1000;
      if (lum < 110) {
        darkR += r; darkG += g; darkB += b; darkCount++;
      } else if (lum > 170) {
        brightR += r; brightG += g; brightB += b; brightCount++;
      }
    }

    if (darkCount > brightCount && darkCount > 5) {
      const r = Math.round(darkR / darkCount);
      const g = Math.round(darkG / darkCount);
      const b = Math.round(darkB / darkCount);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    } else if (brightCount > 5) {
      return '#FFFFFF';
    }
  } catch {
    // fallback
  }
  return '#0f172a';
}

// =====================================================================
// STEP 2 — GEMINI VISION API CALL
// =====================================================================

/**
 * Single Gemini Vision API call to extract structured layout from a card template image.
 * Returns typed element array with bounding boxes, types, and field suggestions.
 */
async function callGeminiVisionForLayout(
  base64Data: string,
  mimeType: string,
  debugLogs: string[]
): Promise<GeminiLayoutElement[]> {
  const prompt = `You are a precision Design Template Layout Analyzer. Your job is to identify the visual structure of an ID card or badge template image — extracting every discrete element with its exact position.

TASK:
Analyze this card template image. For every visible element, detect:
- Its type (text label, text value, photo placeholder, QR/barcode, logo, or decorative element)
- Its exact position as a bounding box
- What data field it represents (if any)
- Whether it changes per person or stays static

CRITICAL RULES:
- Only include elements that are ACTUALLY VISIBLE in the image.
- Never invent, guess, or pad a field, label, or region that isn't there.
- If only 2 fields exist on this card, return exactly 2 elements. Do NOT add phantom fields.
- Distinguish static labels ("Name:", "ID No:") from per-person values ("Amara Okafor", "STU-2024-001").
- A label like "Name:" is type "text_label" with is_per_person=false.
- A value like "Amara Okafor" is type "text_value" with is_per_person=true.
- Photo placeholder regions (empty frames, sample portraits) are type "photo".
- QR codes and barcodes are type "code".
- Organization logos are type "logo".
- Decorative borders, lines, shapes, watermarks are type "decorative".
- For bounding boxes, use [y_min, x_min, y_max, x_max] on a normalized 0-1000 scale where (0,0) is top-left and (1000,1000) is bottom-right.
- For suggested_field, use one of: full_name, first_name, last_name, id_number, dob, address, department, grade, role, phone, email, blood_group, gender, joined_date, issue_date, valid_until, expiry, academic_year, section, parent_name, guardian, emergency_phone, photo, qr_code, barcode — or null if not a data field.
- Handle text in any language: English, Amharic, Ge'ez, Oromo, Arabic, etc.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this exact schema:
{
  "elements": [
    {
      "type": "text_label" | "text_value" | "photo" | "code" | "logo" | "decorative",
      "content": "the actual text visible in this region, or a description for non-text elements",
      "bbox": [y_min, x_min, y_max, x_max],
      "suggested_field": "field_name_or_null",
      "is_per_person": true_or_false
    }
  ]
}`;

  debugLogs.push('[Step 2: Gemini Vision] Sending template image for AI layout analysis...');

  let textOutput: string;
  try {
    textOutput = await callGeminiVision(prompt, base64Data, mimeType);
  } catch (err: any) {
    const errMsg = `Gemini Vision API call failed: ${err?.message || String(err)}`;
    debugLogs.push(`[Step 2: ERROR] ${errMsg}`);
    throw new Error(errMsg);
  }

  debugLogs.push(`[Step 2: Gemini Vision] Received raw response (${textOutput.length} chars). Parsing...`);

  // Defensive: strip ```json fences before parsing
  const cleanedJson = stripJsonFences(textOutput);

  let parsed: GeminiLayoutResponse;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (parseErr: any) {
    const errMsg = `Failed to parse Gemini JSON: ${parseErr?.message}. Raw: ${cleanedJson.substring(0, 200)}...`;
    debugLogs.push(`[Step 2: PARSE ERROR] ${errMsg}`);
    throw new Error(errMsg);
  }

  if (!parsed.elements || !Array.isArray(parsed.elements)) {
    debugLogs.push('[Step 2: WARNING] No elements array in Gemini response. Returning empty.');
    return [];
  }

  // Validate each element has required fields
  const validElements = parsed.elements.filter(el => {
    if (!el.type || !el.bbox || !Array.isArray(el.bbox) || el.bbox.length !== 4) {
      debugLogs.push(`[Step 2: SKIP] Invalid element: ${JSON.stringify(el).substring(0, 100)}`);
      return false;
    }
    // Validate bbox values are in 0-1000 range
    const [yMin, xMin, yMax, xMax] = el.bbox;
    if (yMin < 0 || xMin < 0 || yMax > 1000 || xMax > 1000 || yMin >= yMax || xMin >= xMax) {
      debugLogs.push(`[Step 2: SKIP] Invalid bbox [${el.bbox.join(',')}] for "${el.content?.substring(0, 30)}"`);
      return false;
    }
    return true;
  });

  debugLogs.push(`[Step 2: Gemini Vision] ✅ Parsed ${validElements.length} valid layout elements (from ${parsed.elements.length} total).`);
  return validElements;
}

// =====================================================================
// STEP 3 — GEMINI OUTPUT → DeconstructedField ADAPTER
// =====================================================================

/**
 * Converts Gemini's normalized bbox [y_min, x_min, y_max, x_max] (0-1000)
 * to pixel coordinates {x, y, w, h} using the ACTUAL target dimensions.
 * 
 * DOES NOT hardcode CARD.WIDTH_PX/HEIGHT_PX — uses whatever the caller passes.
 */
function bboxToPixels(
  bbox: [number, number, number, number],
  targetWidth: number,
  targetHeight: number
): { x: number; y: number; w: number; h: number } {
  const [yMin, xMin, yMax, xMax] = bbox;
  const x = Math.round((xMin / 1000) * targetWidth);
  const y = Math.round((yMin / 1000) * targetHeight);
  const w = Math.max(10, Math.round(((xMax - xMin) / 1000) * targetWidth));
  const h = Math.max(8, Math.round(((yMax - yMin) / 1000) * targetHeight));
  return { x, y, w, h };
}

/**
 * Maps a Gemini element to a DeconstructedField that ImportAnalysisModal expects.
 */
function mapGeminiElementToField(
  el: GeminiLayoutElement,
  index: number,
  targetWidth: number,
  targetHeight: number,
  analysisCtx: CanvasRenderingContext2D,
  debugLogs: string[]
): DeconstructedField {
  const pixelBbox = bboxToPixels(el.bbox, targetWidth, targetHeight);

  // Map Gemini type → our DeconstructedField type
  let fieldType: DeconstructedField['type'];
  switch (el.type) {
    case 'photo':
      fieldType = 'photo';
      break;
    case 'code':
      // Determine barcode vs QR from aspect ratio
      const ratio = pixelBbox.w / pixelBbox.h;
      fieldType = (ratio > 0.8 && ratio < 1.3) ? 'qr' : 'barcode';
      break;
    case 'text_label':
    case 'logo':
      fieldType = 'header';
      break;
    case 'text_value':
      fieldType = 'text';
      break;
    case 'decorative':
      fieldType = 'header'; // decorative elements are static
      break;
    default:
      fieldType = 'text';
  }

  // Map suggested_field → our {{binding}} token
  let suggestedBinding = '';
  if (el.suggested_field) {
    const normalized = el.suggested_field.toLowerCase().replace(/[\s\-]/g, '_');
    suggestedBinding = FIELD_BINDING_MAP[normalized] || '';
  }

  // For photo and code types, set special bindings
  if (el.type === 'photo') {
    suggestedBinding = '{{photo}}';
  } else if (el.type === 'code') {
    suggestedBinding = fieldType === 'qr' ? '{{qr_code}}' : '{{barcode}}';
  }

  // Local pixel sampling for text color (AI can't reliably do this)
  const fontColor = (el.type === 'text_label' || el.type === 'text_value')
    ? sampleTextColor(analysisCtx, pixelBbox.x, pixelBbox.y, pixelBbox.w, pixelBbox.h)
    : '#0f172a';

  // Font size estimation from bounding box height
  const fontSize = (el.type === 'text_label' || el.type === 'text_value')
    ? Math.max(10, Math.min(48, Math.round(pixelBbox.h * 0.85)))
    : 14;

  // Build human-readable label
  let label: string;
  if (el.type === 'photo') {
    label = 'Photo Frame';
  } else if (el.type === 'code') {
    label = fieldType === 'qr' ? 'QR Code' : 'Barcode';
  } else if (el.type === 'logo') {
    label = 'Logo / Emblem';
  } else if (el.type === 'decorative') {
    label = 'Decorative Element';
  } else if (el.type === 'text_label') {
    label = `Label: ${el.content || 'Static Text'}`;
  } else {
    // text_value — use the suggested field name or generic
    if (el.suggested_field) {
      const fieldLabel = el.suggested_field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      label = fieldLabel;
    } else {
      label = 'Text Field';
    }
  }

  // Build replacement text
  let replacementText: string;
  if (suggestedBinding && el.type === 'text_value') {
    replacementText = suggestedBinding;
  } else if (suggestedBinding && el.type === 'text_label') {
    // Labels keep their original text
    replacementText = el.content || '';
  } else {
    replacementText = el.content || '';
  }

  // Determine isCircle for photo elements
  const isCircle = el.type === 'photo'
    ? (pixelBbox.w / pixelBbox.h > 0.8 && pixelBbox.w / pixelBbox.h < 1.25)
    : false;

  const field: DeconstructedField = {
    id: `field-${el.type}-${index + 1}`,
    originalText: el.content || '',
    label,
    sampleValue: el.content || '',
    suggestedBinding,
    replacementText,
    confidence: 0.95, // Gemini Vision is high-confidence
    bbox: pixelBbox,
    fontSize,
    fontColor,
    fontWeight: el.type === 'text_label' ? 'bold' : 'normal',
    type: fieldType,
    isCircle,
    // All elements are pre-selected; labels are included in the toggle list
    selected: true,
  };

  debugLogs.push(
    `  [Element ${index + 1}] "${el.content?.substring(0, 40) || '(non-text)'}" → type=${fieldType}, ` +
    `binding=${suggestedBinding || '(none)'}, per_person=${el.is_per_person}, ` +
    `bbox=(${pixelBbox.x},${pixelBbox.y},${pixelBbox.w}x${pixelBbox.h})`
  );

  return field;
}

// =====================================================================
// MAIN PIPELINE — deconstructDesignImage
// =====================================================================

/**
 * Main General-Purpose Design Deconstructor — Hybrid AI + Pixel Math Pipeline
 * 
 * Analyzes ANY image file using:
 * 1. Single Gemini Vision API call for semantic layout extraction
 * 2. Local pixel math for precise colors, fonts, and background patching
 * 
 * Uses targetWidth/targetHeight from caller — NOT hardcoded CARD constants.
 * Front and Back sides run independently.
 */
export async function deconstructDesignImage(
  imageSource: File | string,
  targetWidth: number,
  targetHeight: number,
  side: 'front' | 'back' = 'front'
): Promise<DeconstructionResult> {
  const debugLogs: string[] = [];
  debugLogs.push(`[Pipeline Start] AI Hybrid Deconstructor for ${side.toUpperCase()} FACE (${targetWidth}x${targetHeight}px)...`);

  // ====== STEP 1: Preprocess Image ======
  let dataUrl = '';
  if (typeof imageSource === 'string') {
    dataUrl = imageSource;
  } else {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(typeof imageSource === 'object' ? `Failed to read file "${imageSource.name}" from disk.` : 'Failed to read image source.'));
      reader.readAsDataURL(imageSource);
    });
  }

  // Load into HTML Image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.src = dataUrl;
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(typeof imageSource === 'object' ? `Failed to decode image from "${imageSource.name}". The file may be corrupt or an unsupported format.` : 'Failed to decode image data URL.'));
  });

  const natW = img.naturalWidth || img.width || targetWidth;
  const natH = img.naturalHeight || img.height || targetHeight;

  debugLogs.push(`[Step 1: Image] Natural size: ${natW}x${natH}px. Target: ${targetWidth}x${targetHeight}px.`);

  // Analysis Canvas (scaled to target card dimensions for pixel sampling)
  const analysisCanvas = document.createElement('canvas');
  analysisCanvas.width = targetWidth;
  analysisCanvas.height = targetHeight;
  const analysisCtx = analysisCanvas.getContext('2d', { willReadFrequently: true });
  if (!analysisCtx) throw new Error('Could not get analysis canvas context');
  analysisCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Background Masking Canvas (will be patched)
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = targetWidth;
  bgCanvas.height = targetHeight;
  const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
  if (!bgCtx) throw new Error('Could not get background canvas context');
  bgCtx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // ====== STEP 2: Gemini Vision API Call ======
  // Extract base64 payload for API call
  const dataUrlMatch = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  const mimeType = dataUrlMatch ? dataUrlMatch[1] : 'image/jpeg';
  const base64Data = dataUrlMatch ? dataUrlMatch[2] : dataUrl;

  let geminiElements: GeminiLayoutElement[] = [];

  try {
    geminiElements = await callGeminiVisionForLayout(base64Data, mimeType, debugLogs);
  } catch (err: any) {
    // API failure: provide clear error info, return usable (empty) result
    debugLogs.push(`[Step 2: FATAL] Gemini API call failed: ${err?.message || String(err)}`);
    debugLogs.push('[Step 2: FATAL] The image will be imported as a plain background layer. You can retry the analysis.');

    // Return a minimal result with just the background
    const cleanedBackgroundUrl = bgCanvas.toDataURL('image/png');
    return {
      cleanedBackgroundUrl,
      originalImageUrl: dataUrl,
      widthPx: targetWidth,
      heightPx: targetHeight,
      side,
      fields: [],
      generatedLayers: [{
        id: `base-card-bg-${side}-${Date.now()}`,
        type: 'image',
        x: 0,
        y: 0,
        width: targetWidth,
        height: targetHeight,
        src: cleanedBackgroundUrl,
        opacity: 1,
        visible: true,
        locked: false,
        name: `Base Graphic (${side.toUpperCase()} Face)`,
      }],
      rawOcrLines: [],
      debugLog: debugLogs,
      photoDetected: false,
      codeDetected: false,
    };
  }

  // ====== STEP 3: Convert Gemini elements → DeconstructedField[] ======
  debugLogs.push(`[Step 3: Mapping] Converting ${geminiElements.length} Gemini elements to canvas fields...`);

  const fields: DeconstructedField[] = [];
  const rawOcrLines: RawOcrLine[] = [];

  for (let i = 0; i < geminiElements.length; i++) {
    const el = geminiElements[i];
    const pixelBbox = bboxToPixels(el.bbox, targetWidth, targetHeight);

    // Build RawOcrLine for debug panel
    let classification: RawOcrLine['classification'];
    switch (el.type) {
      case 'text_value':
        classification = 'bound-field';
        break;
      case 'text_label':
        classification = 'label';
        break;
      case 'photo':
        classification = 'photo';
        break;
      case 'code':
        classification = 'code';
        break;
      case 'logo':
        classification = 'header-or-text';
        break;
      case 'decorative':
        classification = 'decorative';
        break;
      default:
        classification = 'header-or-text';
    }

    const binding = el.suggested_field
      ? (FIELD_BINDING_MAP[el.suggested_field.toLowerCase().replace(/[\s\-]/g, '_')] || '')
      : '';

    rawOcrLines.push({
      index: i + 1,
      text: el.content || `(${el.type})`,
      confidence: 95,
      bbox: {
        x0: pixelBbox.x,
        y0: pixelBbox.y,
        x1: pixelBbox.x + pixelBbox.w,
        y1: pixelBbox.y + pixelBbox.h,
      },
      classification,
      ruleMatched: el.type === 'text_value' ? 'AI Vision' : undefined,
      suggestedBinding: binding || undefined,
    });

    // Map to DeconstructedField
    const field = mapGeminiElementToField(el, i, targetWidth, targetHeight, analysisCtx, debugLogs);
    fields.push(field);
  }

  // ====== STEP 4 & 5: Background Reconstruction ======
  // Mask ALL text regions (both labels and values), photo, and code from background.
  // Only decorative and logo elements stay on the background raster.
  debugLogs.push(`[Step 4-5: Background] Masking ${fields.length} element regions from background...`);

  let photoDetected = false;
  let codeDetected = false;

  for (let i = 0; i < geminiElements.length; i++) {
    const el = geminiElements[i];
    const field = fields[i];

    // Decorative elements stay on the background — they're borders, watermarks, gradients
    if (el.type === 'decorative') {
      debugLogs.push(`  [BG] Keeping decorative element "${el.content?.substring(0, 30)}" on background.`);
      continue;
    }

    // Everything else gets masked: text_label, text_value, photo, code, logo
    maskClaimedRegion(
      bgCtx,
      field.bbox.x,
      field.bbox.y,
      field.bbox.w,
      field.bbox.h,
      targetWidth,
      targetHeight,
      field.isCircle || false
    );

    if (el.type === 'photo') photoDetected = true;
    if (el.type === 'code') codeDetected = true;

    debugLogs.push(`  [BG] Masked "${el.content?.substring(0, 30) || el.type}" at (${field.bbox.x},${field.bbox.y}).`);
  }

  // ====== STEP 6: Export & Assemble CanvasElement Layers ======
  const cleanedBackgroundUrl = bgCanvas.toDataURL('image/png');
  const generatedLayers = buildCanvasElements(cleanedBackgroundUrl, fields, targetWidth, targetHeight, side);

  debugLogs.push(`[Step 6: Assembly] Built ${generatedLayers.length} discrete Konva layers (${fields.length} elements + base graphic).`);
  debugLogs.push(`[Pipeline Complete] ✅ ${side.toUpperCase()} face analysis finished. Photo: ${photoDetected ? 'YES' : 'NO'}, Code: ${codeDetected ? 'YES' : 'NO'}.`);

  return {
    cleanedBackgroundUrl,
    originalImageUrl: dataUrl,
    widthPx: targetWidth,
    heightPx: targetHeight,
    side,
    fields,
    generatedLayers,
    rawOcrLines,
    debugLog: debugLogs,
    photoDetected,
    codeDetected,
  };
}

// =====================================================================
// STEP 6 — BUILD KONVA CANVAS ELEMENTS
// =====================================================================

/**
 * Builds Konva CanvasElements from the extracted fields and segmented background.
 * 
 * Labels become independent, locked-but-unlockable text layers.
 * Per-person values become independent text layers with {{binding}} tokens.
 * Photo/code regions become independent placeholder layers.
 */
export function buildCanvasElements(
  cleanedBackgroundUrl: string,
  fields: DeconstructedField[],
  targetWidth: number,
  targetHeight: number,
  side: 'front' | 'back' = 'front'
): CanvasElement[] {
  const timestamp = Date.now();
  let count = 100;
  const layers: CanvasElement[] = [];

  // 1. Base Layer: The clean segmented background graphic (decorative art only)
  layers.push({
    id: `base-card-bg-${side}-${timestamp}`,
    type: 'image',
    x: 0,
    y: 0,
    width: targetWidth,
    height: targetHeight,
    src: cleanedBackgroundUrl,
    opacity: 1,
    visible: true,
    locked: false,
    name: `Base Graphic (${side.toUpperCase()} Face)`,
  });

  // 2. Add each selected deconstructed field as a discrete moveable layer
  for (const f of fields) {
    if (!f.selected) continue;

    if (f.type === 'photo') {
      layers.push({
        id: `imported-photo-${side}-${count++}`,
        type: 'photo',
        x: f.bbox.x,
        y: f.bbox.y,
        width: f.bbox.w,
        height: f.bbox.h,
        src: '',
        opacity: 1,
        visible: true,
        locked: false,
        name: `${side === 'front' ? 'Front' : 'Back'} Photo Avatar`,
      });
    } else if (f.type === 'barcode') {
      layers.push({
        id: `imported-barcode-${side}-${count++}`,
        type: 'barcode',
        x: f.bbox.x,
        y: f.bbox.y,
        width: f.bbox.w,
        height: f.bbox.h,
        text: '{{id_number}}',
        barcodeType: 'code128',
        barcodeValue: '{{id_number}}',
        opacity: 1,
        visible: true,
        locked: false,
        name: 'Barcode (Code 128)',
      });
    } else if (f.type === 'qr') {
      layers.push({
        id: `imported-qr-${side}-${count++}`,
        type: 'qr',
        x: f.bbox.x,
        y: f.bbox.y,
        width: f.bbox.w,
        height: f.bbox.h,
        text: '{{id_number}}',
        opacity: 1,
        visible: true,
        locked: false,
        name: 'QR Code',
      });
    } else {
      // Text or Header element — labels get their own independent layer (locked by default)
      const isLabel = f.type === 'header';
      layers.push({
        id: `imported-text-${side}-${count++}`,
        type: 'text',
        x: f.bbox.x,
        y: f.bbox.y,
        width: f.bbox.w,
        height: Math.max(28, f.bbox.h),
        text: f.replacementText,
        fontSize: f.fontSize,
        fontFamily: 'Inter',
        fill: f.fontColor || '#0f172a',
        fontWeight: f.fontWeight,
        opacity: 1,
        visible: true,
        locked: isLabel, // Labels are locked by default but can be unlocked
        name: f.label || 'Text Field',
      });
    }
  }

  return layers;
}
