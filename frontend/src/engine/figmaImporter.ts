/**
 * SiliconLabs Native Figma REST API Importer & Deconstructor
 * 
 * Fetches Figma file document tree via Figma REST API (using Personal Access Token),
 * extracts canvas frames, vectors, texts, images, and maps them to CanvasElement[].
 */

import type { CanvasElement } from '../db/database';
import { CARD } from '../design-tokens';

export interface FigmaImportResult {
  fileKey: string;
  name: string;
  thumbnailUrl?: string;
  cardWidth: number;
  cardHeight: number;
  backgroundColor: string;
  elements: CanvasElement[];
  backElements?: CanvasElement[];
}

/**
 * Parses the fileKey from any Figma URL
 * Examples:
 * - https://www.figma.com/design/abc123XYZ/My-Card
 * - https://www.figma.com/file/abc123XYZ/My-Card?node-id=0%3A1
 */
export function extractFigmaFileKey(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  // If user pasted just the file key directly
  if (/^[a-zA-Z0-9_-]{15,40}$/.test(url.trim())) {
    return url.trim();
  }
  return null;
}

/**
 * Converts Figma RGB [0..1] to hex color string (#RRGGBB)
 */
function figmaColorToHex(color?: { r: number; g: number; b: number; a?: number }): string {
  if (!color) return '#000000';
  const r = Math.round((color.r ?? 0) * 255).toString(16).padStart(2, '0');
  const g = Math.round((color.g ?? 0) * 255).toString(16).padStart(2, '0');
  const b = Math.round((color.b ?? 0) * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

/**
 * Checks if a text layer looks like a dynamic data placeholder (e.g. {{fullName}}, "John Doe", "ID-1234")
 */
function detectDataBinding(text: string, layerName: string): string | undefined {
  const combined = `${layerName} ${text}`.toLowerCase();
  if (combined.includes('name') || combined.includes('holder') || combined.includes('student') || combined.includes('employee')) {
    return 'fullName';
  }
  if (combined.includes('id') || combined.includes('roll') || combined.includes('reg') || combined.includes('badge')) {
    return 'idNumber';
  }
  if (combined.includes('dept') || combined.includes('department') || combined.includes('faculty') || combined.includes('grade')) {
    return 'department';
  }
  if (combined.includes('role') || combined.includes('title') || combined.includes('position') || combined.includes('rank')) {
    return 'role';
  }
  if (combined.includes('school') || combined.includes('university') || combined.includes('company') || combined.includes('org')) {
    return 'schoolName';
  }
  if (combined.includes('phone') || combined.includes('mobile') || combined.includes('tel')) {
    return 'phone';
  }
  if (combined.includes('email') || combined.includes('mail')) {
    return 'email';
  }
  if (combined.includes('blood') || combined.includes('group')) {
    return 'bloodGroup';
  }
  return undefined;
}

/**
 * Fetches and deconstructs a Figma file into Card Studio Canvas Elements
 */
export async function importFigmaDesign(figmaUrl: string, accessToken: string): Promise<FigmaImportResult> {
  const fileKey = extractFigmaFileKey(figmaUrl);
  if (!fileKey) {
    throw new Error('Invalid Figma URL. Please provide a link like: https://www.figma.com/design/XXXXX/My-ID-Card');
  }

  const cleanToken = accessToken.trim();
  if (!cleanToken) {
    throw new Error('Figma Access Token is required. Please provide your Figma Personal Access Token.');
  }

  // 1. Fetch file document from Figma REST API
  const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': cleanToken,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 403 || response.status === 401) {
      throw new Error('Figma API Token is invalid or expired. Please check your Personal Access Token.');
    }
    if (response.status === 404) {
      throw new Error('Figma file not found. Ensure the link is correct and your token has permission to access it.');
    }
    throw new Error(`Figma API error (${response.status}): ${errorBody || response.statusText}`);
  }

  const figmaData = await response.json();
  const document = figmaData.document;
  const fileName = figmaData.name || 'Figma ID Card Design';

  // Find canvas pages / top-level frames
  const pages = document.children || [];
  let targetFrame: any = null;
  let backFrame: any = null;

  for (const page of pages) {
    const children = page.children || [];
    for (const child of children) {
      if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'GROUP') {
        const name = (child.name || '').toLowerCase();
        if (name.includes('back') || name.includes('rear') || name.includes('side 2')) {
          if (!backFrame) backFrame = child;
        } else if (!targetFrame) {
          targetFrame = child;
        }
      }
    }
    if (targetFrame) break;
  }

  // If no frame found, fallback to the first child or whole page bounding box
  if (!targetFrame && pages[0]?.children?.[0]) {
    targetFrame = pages[0].children[0];
  }

  if (!targetFrame) {
    throw new Error('No design frames or elements found in this Figma file.');
  }

  const frameBox = targetFrame.absoluteBoundingBox || { x: 0, y: 0, width: CARD.WIDTH_PX, height: CARD.HEIGHT_PX };
  const cardWidth = Math.round(frameBox.width) || CARD.WIDTH_PX;
  const cardHeight = Math.round(frameBox.height) || CARD.HEIGHT_PX;

  // Background color
  let backgroundColor = '#FFFFFF';
  if (targetFrame.backgroundColor) {
    backgroundColor = figmaColorToHex(targetFrame.backgroundColor);
  } else if (Array.isArray(targetFrame.fills) && targetFrame.fills[0]?.color) {
    backgroundColor = figmaColorToHex(targetFrame.fills[0].color);
  }

  // Helper to convert node tree to CanvasElement
  const elements: CanvasElement[] = [];

  function processFigmaNode(node: any, originX: number, originY: number) {
    if (node.visible === false) return;

    const bbox = node.absoluteBoundingBox || { x: originX, y: originY, width: 50, height: 50 };
    const x = Math.round(bbox.x - originX);
    const y = Math.round(bbox.y - originY);
    const w = Math.max(5, Math.round(bbox.width));
    const h = Math.max(5, Math.round(bbox.height));
    const rotation = node.rotation ? Math.round((node.rotation * 180) / Math.PI) : 0;
    const opacity = node.opacity !== undefined ? node.opacity : 1;

    // Fill & Stroke
    const primaryFill = Array.isArray(node.fills) && node.fills.find((f: any) => f.visible !== false && f.color);
    const fill = primaryFill ? figmaColorToHex(primaryFill.color) : undefined;
    const primaryStroke = Array.isArray(node.strokes) && node.strokes.find((s: any) => s.visible !== false && s.color);
    const stroke = primaryStroke ? figmaColorToHex(primaryStroke.color) : undefined;
    const strokeWidth = node.strokeWeight || (stroke ? 1 : 0);
    const cornerRadius = node.cornerRadius || (Array.isArray(node.rectangleCornerRadii) ? node.rectangleCornerRadii[0] : 0);

    const nodeName = node.name || node.type;

    // 1. Text Nodes
    if (node.type === 'TEXT') {
      const text = node.characters || 'Text';
      const style = node.style || {};
      const fontSize = Math.round(style.fontSize) || 16;
      const fontFamily = style.fontFamily || 'Inter';
      const fontStyle = (style.fontWeight && style.fontWeight >= 700) ? 'bold' : 'normal';
      const align = (style.textAlignHorizontal || 'LEFT').toLowerCase() as 'left' | 'center' | 'right';
      const binding = detectDataBinding(text, nodeName);

      elements.push({
        id: `figma-${node.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: binding ? 'dataField' : 'text',
        name: nodeName,
        text: binding ? `{{${binding}}}` : text,
        dataField: binding,
        x,
        y,
        width: w,
        height: h,
        fontSize,
        fontFamily,
        fontStyle,
        fill: fill || '#0F172A',
        align,
        rotation,
        opacity,
        visible: true,
        locked: Boolean(node.locked),
      });
      return;
    }

    // 2. Photo / Avatar Placeholder (circle/rect named Photo/Avatar/User)
    const lowerName = nodeName.toLowerCase();
    if (lowerName.includes('photo') || lowerName.includes('avatar') || lowerName.includes('picture') || lowerName.includes('portrait')) {
      elements.push({
        id: `figma-${node.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'photo',
        name: 'Personnel Photo Placeholder',
        x,
        y,
        width: w,
        height: h,
        cornerRadius: cornerRadius || (node.type === 'ELLIPSE' ? w / 2 : 8),
        fill: '#1E293B',
        stroke: '#10B981',
        strokeWidth: 2,
        rotation,
        opacity,
        visible: true,
        locked: Boolean(node.locked),
      });
      return;
    }

    // 3. QR Code / Barcode layer
    if (lowerName.includes('qr') || lowerName.includes('qrcode')) {
      elements.push({
        id: `figma-${node.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'qr',
        name: 'Smart QR Code',
        x,
        y,
        width: Math.min(w, h),
        height: Math.min(w, h),
        qrPayload: '{{idNumber}}',
        fill: '#FFFFFF',
        rotation,
        opacity,
        visible: true,
        locked: Boolean(node.locked),
      });
      return;
    }

    if (lowerName.includes('barcode') || lowerName.includes('code128')) {
      elements.push({
        id: `figma-${node.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'barcode',
        name: 'Official Barcode',
        x,
        y,
        width: w,
        height: h,
        dataField: '{{idNumber}}',
        rotation,
        opacity,
        visible: true,
        locked: Boolean(node.locked),
      });
      return;
    }

    // 4. Circle / Ellipse
    if (node.type === 'ELLIPSE') {
      const radius = Math.round(Math.min(w, h) / 2);
      elements.push({
        id: `figma-${node.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'circle',
        name: nodeName,
        x,
        y,
        width: radius * 2,
        height: radius * 2,
        radius,
        fill: fill || '#3B82F6',
        stroke,
        strokeWidth,
        rotation,
        opacity,
        visible: true,
        locked: Boolean(node.locked),
      });
      return;
    }

    // 5. Star
    if (node.type === 'STAR') {
      elements.push({
        id: `figma-${node.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'star',
        name: nodeName,
        x,
        y,
        width: w,
        height: h,
        fill: fill || '#F59E0B',
        stroke,
        strokeWidth,
        rotation,
        opacity,
        visible: true,
        locked: Boolean(node.locked),
      });
      return;
    }

    // 6. Regular Polygon / Triangle / Hexagon
    if (node.type === 'REGULAR_POLYGON') {
      elements.push({
        id: `figma-${node.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'polygon',
        name: nodeName,
        x,
        y,
        width: w,
        height: h,
        sides: node.pointCount || 3,
        fill: fill || '#3B82F6',
        stroke,
        strokeWidth,
        rotation,
        opacity,
        visible: true,
        locked: Boolean(node.locked),
      });
      return;
    }

    // 7. Lines
    if (node.type === 'LINE') {
      elements.push({
        id: `figma-${node.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'line',
        name: nodeName,
        x,
        y,
        width: w,
        height: Math.max(2, h),
        stroke: stroke || fill || '#94A3B8',
        strokeWidth: Math.max(1, strokeWidth),
        rotation,
        opacity,
        visible: true,
        locked: Boolean(node.locked),
      });
      return;
    }

    // 8. Rectangles / Frames
    if (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'VECTOR') {
      // If it's the background frame itself, skip creating an element
      if (node.id === targetFrame.id) {
        if (Array.isArray(node.children)) {
          node.children.forEach((c: any) => processFigmaNode(c, originX, originY));
        }
        return;
      }

      elements.push({
        id: `figma-${node.id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'rect',
        name: nodeName,
        x,
        y,
        width: w,
        height: h,
        fill: fill || 'transparent',
        stroke,
        strokeWidth,
        cornerRadius,
        rotation,
        opacity,
        visible: true,
        locked: Boolean(node.locked),
      });

      // Process children if nested frame/group
      if (Array.isArray(node.children)) {
        node.children.forEach((c: any) => processFigmaNode(c, originX, originY));
      }
      return;
    }

    // Recurse children for groups / booleans
    if (Array.isArray(node.children)) {
      node.children.forEach((c: any) => processFigmaNode(c, originX, originY));
    }
  }

  // Process all layers in target frame
  if (Array.isArray(targetFrame.children)) {
    targetFrame.children.forEach((c: any) => processFigmaNode(c, frameBox.x, frameBox.y));
  } else {
    processFigmaNode(targetFrame, frameBox.x, frameBox.y);
  }

  return {
    fileKey,
    name: fileName,
    thumbnailUrl: figmaData.thumbnailUrl,
    cardWidth,
    cardHeight,
    backgroundColor,
    elements,
  };
}
