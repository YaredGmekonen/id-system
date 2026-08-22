import Konva from 'konva';
import { CARD } from '../design-tokens';
import type { CanvasElement, CardTemplate, Person } from '../db/database';
import { generateQrDataUrl, generateBarcodeDataUrl } from './barcodeQr';

/**
 * Renders a hydrated ID card for a specific person using a template.
 * Returns a PNG data URL of the rendered card at 300 DPI equivalent.
 */
export async function renderCard(
  template: CardTemplate,
  person: Person,
  side: 'front' | 'back' = 'front'
): Promise<string> {
  const elements = side === 'front' ? template.frontElements : template.backElements;
  const bgColor = side === 'front' ? template.backgroundColor : template.backBackgroundColor;

  const cardWidth = template.widthPx || (template.orientation === 'vertical' ? CARD.HEIGHT_PX : CARD.WIDTH_PX);
  const cardHeight = template.heightPx || (template.orientation === 'vertical' ? CARD.WIDTH_PX : CARD.HEIGHT_PX);

  // Create offscreen container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  try {
    const stage = new Konva.Stage({
      container,
      width: cardWidth,
      height: cardHeight,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Card background
    const bg = new Konva.Rect({
      x: 0,
      y: 0,
      width: cardWidth,
      height: cardHeight,
      fill: bgColor || '#FFFFFF',
      cornerRadius: 12,
    });
    layer.add(bg);

    // Render each element sequentially
    for (const el of elements) {
      if (el.visible === false) continue;
      await renderElement(layer, el, person);
    }

    layer.draw();

    // Export to 2x high-res PNG data URL (Print grade)
    const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });

    stage.destroy();
    return dataUrl;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Renders a single element onto the layer, hydrating data fields with person data.
 */
async function renderElement(
  layer: Konva.Layer,
  el: CanvasElement,
  person: Person
): Promise<void> {
  switch (el.type) {
    case 'text': {
      const textNode = new Konva.Text({
        x: el.x,
        y: el.y,
        text: el.text || '',
        fontSize: el.fontSize || 16,
        fontFamily: el.fontFamily || 'Inter',
        fontStyle: el.fontStyle || 'normal',
        fill: el.fill || '#14171A',
        align: el.align || 'left',
        width: el.width,
        opacity: el.opacity ?? 1,
        rotation: el.rotation || 0,
        textDecoration: el.textDecoration,
      });
      layer.add(textNode);
      break;
    }

    case 'dataField': {
      const hydratedText = hydrateText(el.dataField || el.text || '', person);
      const textNode = new Konva.Text({
        x: el.x,
        y: el.y,
        text: hydratedText,
        fontSize: el.fontSize || 18,
        fontFamily: el.fontFamily || 'Inter',
        fontStyle: el.fontStyle || 'bold',
        fill: el.fill || '#14171A',
        align: el.align || 'left',
        width: el.width,
        opacity: el.opacity ?? 1,
        rotation: el.rotation || 0,
        textDecoration: el.textDecoration,
      });
      layer.add(textNode);
      break;
    }

    case 'rect': {
      const rect = new Konva.Rect({
        x: el.x,
        y: el.y,
        width: el.width || 100,
        height: el.height || 60,
        fill: el.fill || '#14213D',
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        cornerRadius: el.cornerRadius || 0,
        opacity: el.opacity ?? 1,
        rotation: el.rotation || 0,
      });
      layer.add(rect);
      break;
    }

    case 'circle': {
      const circle = new Konva.Circle({
        x: el.x + (el.radius || 40),
        y: el.y + (el.radius || 40),
        radius: el.radius || 40,
        fill: el.fill || '#0F8B8D',
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        opacity: el.opacity ?? 1,
      });
      layer.add(circle);
      break;
    }

    case 'line':
    case 'arrow': {
      const line = new Konva.Line({
        x: el.x,
        y: el.y,
        points: el.points && el.points.length >= 4 ? el.points : [0, 0, el.width || 100, el.height || 0],
        stroke: el.stroke || el.fill || '#0f172a',
        strokeWidth: el.strokeWidth || 2,
        opacity: el.opacity ?? 1,
        rotation: el.rotation || 0,
      });
      layer.add(line);
      break;
    }

    case 'photo': {
      const photoWidth = el.width || 180;
      const photoHeight = el.height || 220;
      const photoRadius = el.cornerRadius !== undefined ? el.cornerRadius : 8;

      if (person.photoDataUrl) {
        try {
          const img = await loadImage(person.photoDataUrl);
          const imageNode = new Konva.Image({
            x: el.x,
            y: el.y,
            image: img,
            width: photoWidth,
            height: photoHeight,
            cornerRadius: photoRadius,
            stroke: el.stroke,
            strokeWidth: el.strokeWidth,
            opacity: el.opacity ?? 1,
          });
          layer.add(imageNode);
        } catch {
          renderPhotoFallback(layer, el, person);
        }
      } else {
        renderPhotoFallback(layer, el, person);
      }
      break;
    }

    case 'qr':
    case 'qrCode': {
      const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://id-system-theta.vercel.app';
      const defaultVerify = `${origin}/verify/${person.idNumber || person.id || 'ID-2026-081'}`;
      const qrPayload = el.qrPayload
        ? hydrateText(el.qrPayload, person)
        : defaultVerify;
      const qrDataUrl = await generateQrDataUrl(qrPayload, Math.round(el.width || 120));
      try {
        const img = await loadImage(qrDataUrl);
        const imageNode = new Konva.Image({
          x: el.x,
          y: el.y,
          image: img,
          width: el.width || 100,
          height: el.height || 100,
          opacity: el.opacity ?? 1,
        });
        layer.add(imageNode);
      } catch {
        // Skip on error
      }
      break;
    }

    case 'barcode': {
      const barcodePayload = el.dataField
        ? hydrateText(el.dataField, person)
        : (person.idNumber || '00000000');
      const barcodeDataUrl = await generateBarcodeDataUrl(barcodePayload, Math.round(el.width || 200), Math.round(el.height || 50));
      try {
        const img = await loadImage(barcodeDataUrl);
        const imageNode = new Konva.Image({
          x: el.x,
          y: el.y,
          image: img,
          width: el.width || 200,
          height: el.height || 50,
          opacity: el.opacity ?? 1,
        });
        layer.add(imageNode);
      } catch {
        // Skip on error
      }
      break;
    }

    case 'image': {
      if (el.src) {
        try {
          const img = await loadImage(el.src);
          const imageNode = new Konva.Image({
            x: el.x,
            y: el.y,
            image: img,
            width: el.width || CARD.WIDTH_PX,
            height: el.height || CARD.HEIGHT_PX,
            opacity: el.opacity ?? 1,
            rotation: el.rotation || 0,
          });
          layer.add(imageNode);
        } catch {
          // Skip broken images silently
        }
      }
      break;
    }

    case 'star': {
      const starNode = new Konva.Star({
        x: el.x + (el.width || 60) / 2,
        y: el.y + (el.height || 60) / 2,
        numPoints: el.starPoints || 5,
        innerRadius: el.innerRadius || ((el.width || 60) * 0.22),
        outerRadius: (el.width || 60) / 2,
        fill: el.fill || '#F59E0B',
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        opacity: el.opacity ?? 1,
      });
      layer.add(starNode);
      break;
    }

    case 'polygon':
    case 'badgeShield': {
      const polyNode = new Konva.RegularPolygon({
        x: el.x + (el.width || 60) / 2,
        y: el.y + (el.height || 60) / 2,
        sides: el.sides || 6,
        radius: (el.width || 60) / 2,
        fill: el.fill || '#3B82F6',
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        opacity: el.opacity ?? 1,
      });
      layer.add(polyNode);
      break;
    }

    case 'pill': {
      const pillGroup = new Konva.Group({ x: el.x, y: el.y });
      const rect = new Konva.Rect({
        width: el.width || 120,
        height: el.height || 30,
        cornerRadius: (el.height || 30) / 2,
        fill: el.fill || '#10B981',
      });
      pillGroup.add(rect);
      if (el.text) {
        const text = new Konva.Text({
          text: el.text,
          width: el.width || 120,
          y: (el.height || 30) / 2 - 6,
          align: 'center',
          fontSize: el.fontSize || 11,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#FFFFFF',
        });
        pillGroup.add(text);
      }
      layer.add(pillGroup);
      break;
    }

    default: {
      // Fallback for custom badges
      break;
    }
  }
}

function renderPhotoFallback(layer: Konva.Layer, el: CanvasElement, person: Person) {
  const rect = new Konva.Rect({
    x: el.x,
    y: el.y,
    width: el.width || 180,
    height: el.height || 220,
    fill: '#E1E3DF',
    cornerRadius: el.cornerRadius !== undefined ? el.cornerRadius : 8,
    stroke: el.stroke || '#C8CCC4',
    strokeWidth: el.strokeWidth || 1,
  });
  layer.add(rect);

  const initials = person.fullName ? person.fullName.split(' ').map(n => n[0]).join('').toUpperCase() : 'ID';
  const text = new Konva.Text({
    x: el.x,
    y: el.y + (el.height ? el.height / 2 - 15 : 95),
    width: el.width || 180,
    text: initials,
    fontSize: 28,
    fontFamily: 'Space Grotesk',
    fontStyle: 'bold',
    fill: '#657786',
    align: 'center',
  });
  layer.add(text);
}

/**
 * Replaces data field placeholders with actual person data.
 */
function hydrateText(text: string, person: Person): string {
  const parts = (person.fullName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://id-system-theta.vercel.app';
  const verifyUrl = `${origin}/verify/${person.idNumber || person.id || 'ID-2026-081'}`;

  return text
    .replace(/\{\{verify_url\}\}/gi, verifyUrl)
    .replace(/\{\{full_name\}\}/g, person.fullName || '')
    .replace(/\{\{name\}\}/g, person.fullName || '')
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{last_name\}\}/g, lastName)
    .replace(/\{\{id_number\}\}/g, person.idNumber || '')
    .replace(/\{\{id\}\}/g, person.idNumber || '')
    .replace(/\{\{department\}\}/g, person.department || '')
    .replace(/\{\{role\}\}/g, person.role || '')
    .replace(/\{\{phone\}\}/g, person.phone || '')
    .replace(/\{\{email\}\}/g, person.email || '')
    .replace(/\{\{blood_group\}\}/g, person.bloodGroup || 'O+')
    .replace(/\{\{joined_date\}\}/g, person.joinedDate || '')
    .replace(/\{\{status\}\}/g, person.status || 'Active')
    .replace(/\{\{qr_code\}\}/g, verifyUrl);
}

/**
 * Loads an image from a data URL or src.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for non-data URLs — setting it on data: URIs
    // can taint the canvas in some browsers, causing toDataURL() to throw.
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Batch-renders cards for multiple people.
 */
export async function renderBatchCards(
  template: CardTemplate,
  people: Person[],
  onProgress?: (current: number, total: number) => void
): Promise<{ person: Person; frontPng: string; backPng?: string }[]> {
  const results: { person: Person; frontPng: string; backPng?: string }[] = [];
  const hasBack = template.backElements && template.backElements.length > 0;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    const frontPng = await renderCard(template, person, 'front');
    let backPng: string | undefined;

    if (hasBack) {
      backPng = await renderCard(template, person, 'back');
    }

    results.push({ person, frontPng, backPng });
    onProgress?.(i + 1, people.length);
  }

  return results;
}
