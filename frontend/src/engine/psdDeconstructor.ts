/**
 * SiliconLabs Native PSD (Photoshop) Layer Deconstructor
 * 
 * Uses `ag-psd` to parse real, structured layer data (names, bounds,
 * text content, styles, opacity, blend modes) directly from Photoshop .psd files.
 * Zero guesswork — structured data is extracted natively.
 */

import { readPsd, type Psd, type Layer, type Color } from 'ag-psd';
import type { CanvasElement } from '../db/database';
import type { DeconstructedField, DeconstructionResult, RawOcrLine } from './designDeconstructor';
import { CARD } from '../design-tokens';

/** Maps recognized layer/field names to {{binding}} tokens */
const PSD_BINDING_MAP: Record<string, string> = {
  name: '{{full_name}}',
  fullname: '{{full_name}}',
  'full name': '{{full_name}}',
  student_name: '{{full_name}}',
  employee_name: '{{full_name}}',
  id: '{{id_number}}',
  id_number: '{{id_number}}',
  id_no: '{{id_number}}',
  'id no': '{{id_number}}',
  'id number': '{{id_number}}',
  badge_no: '{{id_number}}',
  dob: '{{dob}}',
  'date of birth': '{{dob}}',
  birth_date: '{{dob}}',
  address: '{{address}}',
  location: '{{address}}',
  dept: '{{department}}',
  department: '{{department}}',
  grade: '{{department}}',
  class: '{{department}}',
  role: '{{role}}',
  title: '{{role}}',
  designation: '{{role}}',
  phone: '{{phone}}',
  mobile: '{{phone}}',
  tel: '{{phone}}',
  email: '{{email}}',
  blood: '{{blood_group}}',
  blood_group: '{{blood_group}}',
  gender: '{{status}}',
  sex: '{{status}}',
  photo: '{{photo}}',
  avatar: '{{photo}}',
  portrait: '{{photo}}',
  picture: '{{photo}}',
  image: '{{photo}}',
  qr: '{{qr_code}}',
  qrcode: '{{qr_code}}',
  'qr code': '{{qr_code}}',
  barcode: '{{barcode}}',
  code: '{{barcode}}',
  joined_date: '{{joined_date}}',
  issue_date: '{{joined_date}}',
  expiry: '{{joined_date}}',
  valid_thru: '{{joined_date}}',
};

/**
 * Infers a binding token from layer name or text content.
 */
function inferBinding(name: string, text?: string): { binding: string; label: string } {
  const cleanName = name.toLowerCase().trim();
  if (PSD_BINDING_MAP[cleanName]) {
    return {
      binding: PSD_BINDING_MAP[cleanName],
      label: name,
    };
  }

  // Check substrings in layer name
  for (const [key, token] of Object.entries(PSD_BINDING_MAP)) {
    if (cleanName.includes(key)) {
      return { binding: token, label: name };
    }
  }

  // Check text content if present
  if (text) {
    const cleanText = text.toLowerCase().trim();
    for (const [key, token] of Object.entries(PSD_BINDING_MAP)) {
      if (cleanText.includes(key)) {
        return { binding: token, label: name || key };
      }
    }
  }

  return { binding: '', label: name || 'Layer' };
}

/**
 * Recursively flattens all visible layers from a PSD document or group.
 */
function collectLayers(children: Layer[], result: Layer[] = []): Layer[] {
  for (const layer of children) {
    if (layer.children && layer.children.length > 0) {
      collectLayers(layer.children, result);
    } else {
      result.push(layer);
    }
  }
  return result;
}

/**
 * Extracts true hex color from an ag-psd Color object.
 */
function psdColorToHex(color?: Color): string {
  if (!color) return '#0f172a';
  if ('r' in color && 'g' in color && 'b' in color) {
    const r = Math.round(color.r || 0);
    const g = Math.round(color.g || 0);
    const b = Math.round(color.b || 0);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  if ('fr' in color && 'fg' in color && 'fb' in color) {
    const r = Math.round((color.fr || 0) * 255);
    const g = Math.round((color.fg || 0) * 255);
    const b = Math.round((color.fb || 0) * 255);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
  if ('k' in color) {
    const val = Math.round((1 - (color.k || 0)) * 255);
    return `#${((1 << 24) + (val << 16) + (val << 8) + val).toString(16).slice(1)}`;
  }
  return '#0f172a';
}

/**
 * Parses a Photoshop .psd file into discrete, movable CanvasElements and DeconstructedFields.
 */
export async function deconstructPsdFile(
  fileOrBuffer: File | ArrayBuffer,
  targetWidth: number = CARD.WIDTH_PX,
  targetHeight: number = CARD.HEIGHT_PX,
  side: 'front' | 'back' = 'front'
): Promise<DeconstructionResult> {
  const debugLog: string[] = [];
  debugLog.push(`[PSD Parser] Starting native Photoshop layer extraction for ${side.toUpperCase()} FACE...`);

  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBuffer;
  } else {
    arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error(`Failed to read PSD file "${fileOrBuffer.name}". Check file permissions.`));
      reader.readAsArrayBuffer(fileOrBuffer);
    });
  }

  let psd: Psd;
  try {
    psd = readPsd(arrayBuffer, { skipThumbnail: true });
  } catch (err: any) {
    const msg = `Failed to parse PSD structure: ${err?.message || 'Invalid or corrupted Photoshop file'}`;
    debugLog.push(`[PSD Parser ERROR] ${msg}`);
    throw new Error(msg);
  }

  const psdWidth = psd.width || targetWidth;
  const psdHeight = psd.height || targetHeight;
  const scaleX = targetWidth / psdWidth;
  const scaleY = targetHeight / psdHeight;

  debugLog.push(`[PSD Parser] Document dimensions: ${psdWidth}x${psdHeight}px. Canvas scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}.`);

  // Create composite background canvas
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = targetWidth;
  bgCanvas.height = targetHeight;
  const bgCtx = bgCanvas.getContext('2d');
  if (psd.canvas && bgCtx) {
    bgCtx.drawImage(psd.canvas, 0, 0, targetWidth, targetHeight);
  }

  const rawLayers = collectLayers(psd.children || []);
  debugLog.push(`[PSD Parser] Found ${rawLayers.length} leaf layers in PSD hierarchy.`);

  const fields: DeconstructedField[] = [];
  const generatedLayers: CanvasElement[] = [];
  const rawOcrLines: RawOcrLine[] = [];

  let count = 100;
  let photoDetected = false;
  let codeDetected = false;

  // Add background image layer
  const cleanedBackgroundUrl = bgCanvas.toDataURL('image/png');
  generatedLayers.push({
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
    name: `PSD Composite Background (${side.toUpperCase()})`,
  });

  for (let i = 0; i < rawLayers.length; i++) {
    const layer = rawLayers[i];
    const layerName = layer.name || `Layer ${i + 1}`;
    const left = Math.round((layer.left || 0) * scaleX);
    const top = Math.round((layer.top || 0) * scaleY);
    const width = Math.max(10, Math.round(((layer.right || 0) - (layer.left || 0)) * scaleX));
    const height = Math.max(8, Math.round(((layer.bottom || 0) - (layer.top || 0)) * scaleY));

    // Check if layer is text
    if (layer.text) {
      const textContent = layer.text.text || '';
      const textStyle = layer.text.style;
      const fontSize = Math.max(10, Math.min(60, Math.round((textStyle?.fontSize || 14) * scaleY)));
      const fontColor = psdColorToHex(textStyle?.fillColor);
      const { binding, label } = inferBinding(layerName, textContent);
      const isHeader = fontSize > 20 || layerName.toLowerCase().includes('title') || layerName.toLowerCase().includes('header');

      const field: DeconstructedField = {
        id: `psd-text-${++count}`,
        originalText: textContent,
        label: label || layerName,
        sampleValue: textContent,
        suggestedBinding: binding,
        replacementText: binding ? binding : textContent,
        confidence: 0.99, // Native PSD data is 99% confident
        bbox: { x: left, y: top, w: width, h: height },
        fontSize,
        fontColor,
        fontWeight: isHeader ? 'bold' : 'normal',
        type: isHeader ? 'header' : 'text',
        selected: true,
      };

      fields.push(field);

      rawOcrLines.push({
        index: i + 1,
        text: textContent,
        confidence: 99,
        bbox: { x0: left, y0: top, x1: left + width, y1: top + height },
        classification: binding ? 'bound-field' : 'header-or-text',
        ruleMatched: 'PSD Text Layer',
        suggestedBinding: binding || undefined,
      });

      generatedLayers.push({
        id: `imported-psd-text-${side}-${count}`,
        type: 'text',
        x: left,
        y: top,
        width,
        height,
        text: binding ? binding : textContent,
        fontSize,
        fontFamily: textStyle?.font?.name || 'Inter',
        fill: fontColor,
        fontWeight: isHeader ? 'bold' : 'normal',
        opacity: layer.opacity ?? 1,
        visible: !layer.hidden,
        locked: isHeader,
        name: label || layerName,
      });

      debugLog.push(`  [PSD Text] "${textContent}" @ (${left},${top},${width}x${height}px) -> ${binding || '(static)'}`);
    } else if (layer.canvas) {
      // Raster image/pixel layer
      const { binding, label } = inferBinding(layerName);
      const isPhoto = binding === '{{photo}}' || layerName.toLowerCase().includes('photo') || layerName.toLowerCase().includes('avatar');
      const isQr = binding === '{{qr_code}}' || layerName.toLowerCase().includes('qr');
      const isBarcode = binding === '{{barcode}}' || layerName.toLowerCase().includes('barcode');

      if (isPhoto) photoDetected = true;
      if (isQr || isBarcode) codeDetected = true;

      const layerDataUrl = layer.canvas.toDataURL('image/png');

      if (isPhoto) {
        fields.push({
          id: `psd-photo-${++count}`,
          originalText: layerName,
          label: 'Photo Avatar',
          sampleValue: 'Portrait Image',
          suggestedBinding: '{{photo}}',
          replacementText: '{{photo}}',
          confidence: 0.98,
          bbox: { x: left, y: top, w: width, h: height },
          fontSize: 14,
          fontColor: '#84a92c',
          fontWeight: 'bold',
          type: 'photo',
          selected: true,
        });

        generatedLayers.push({
          id: `imported-psd-photo-${side}-${count}`,
          type: 'photo',
          x: left,
          y: top,
          width,
          height,
          src: layerDataUrl,
          opacity: layer.opacity ?? 1,
          visible: !layer.hidden,
          locked: false,
          name: 'Photo Avatar',
        });
      } else if (isQr) {
        fields.push({
          id: `psd-qr-${++count}`,
          originalText: layerName,
          label: 'QR Code',
          sampleValue: 'QR Matrix',
          suggestedBinding: '{{qr_code}}',
          replacementText: '{{qr_code}}',
          confidence: 0.98,
          bbox: { x: left, y: top, w: width, h: height },
          fontSize: 12,
          fontColor: '#000000',
          fontWeight: 'normal',
          type: 'qr',
          selected: true,
        });

        generatedLayers.push({
          id: `imported-psd-qr-${side}-${count}`,
          type: 'qr',
          x: left,
          y: top,
          width,
          height,
          text: '{{id_number}}',
          opacity: layer.opacity ?? 1,
          visible: !layer.hidden,
          locked: false,
          name: 'QR Code',
        });
      } else if (isBarcode) {
        fields.push({
          id: `psd-barcode-${++count}`,
          originalText: layerName,
          label: 'Barcode',
          sampleValue: 'Barcode Value',
          suggestedBinding: '{{barcode}}',
          replacementText: '{{barcode}}',
          confidence: 0.98,
          bbox: { x: left, y: top, w: width, h: height },
          fontSize: 12,
          fontColor: '#000000',
          fontWeight: 'normal',
          type: 'barcode',
          selected: true,
        });

        generatedLayers.push({
          id: `imported-psd-barcode-${side}-${count}`,
          type: 'barcode',
          x: left,
          y: top,
          width,
          height,
          text: '{{id_number}}',
          barcodeType: 'code128',
          barcodeValue: '{{id_number}}',
          opacity: layer.opacity ?? 1,
          visible: !layer.hidden,
          locked: false,
          name: 'Barcode (Code 128)',
        });
      } else {
        // General graphic or logo layer
        generatedLayers.push({
          id: `imported-psd-layer-${side}-${count++}`,
          type: 'image',
          x: left,
          y: top,
          width,
          height,
          src: layerDataUrl,
          opacity: layer.opacity ?? 1,
          visible: !layer.hidden,
          locked: false,
          name: layerName,
        });
      }

      debugLog.push(`  [PSD Bitmap] "${layerName}" @ (${left},${top},${width}x${height}px)`);
    }
  }

  debugLog.push(`[PSD Parser Complete] ✅ Extracted ${fields.length} interactive fields, ${generatedLayers.length} canvas layers.`);

  return {
    cleanedBackgroundUrl,
    originalImageUrl: cleanedBackgroundUrl,
    widthPx: targetWidth,
    heightPx: targetHeight,
    side,
    fields,
    generatedLayers,
    rawOcrLines,
    debugLog,
    photoDetected,
    codeDetected,
  };
}
