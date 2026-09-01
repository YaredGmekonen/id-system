/**
 * SiliconLabs Unified Card Vector Renderer Engine
 * 
 * Single source of truth for rendering any ID card canvas layout faithfully
 * across all subsystems:
 * - Interactive Design Studio Editor (CardCanvas.tsx)
 * - Studio Showcase & Live Preview (renderStudioCard.ts)
 * - Imposition Board, Paper Print Studio & Batch Export (renderCard.ts)
 * 
 * Renders every shape, vector graphic, frame, security texture, 3D effect,
 * photo mask, QR code, and barcode identically.
 */

import type { CanvasElement } from '../db/database';
import type { Person } from '../db/database';
import { hydrateText } from './hydrateFields';
import { generateQrDataUrl, generateBarcodeDataUrl } from './barcodeQr';
import { CARD } from '../design-tokens';

export interface CardRenderOptions {
  widthPx?: number;
  heightPx?: number;
  dpiScale?: number;
  backgroundColor?: string;
  watermarkText?: string;
}

// In-memory image cache to speed up repeated renders
const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load image from "${src.substring(0, 80)}"`));
    img.src = src;
  });
}

/**
 * Renders fallback portrait avatar with person initials when no photo is uploaded.
 */
export function renderFallbackAvatar(
  ctx: CanvasRenderingContext2D,
  person: Person,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  // Neutral slate gradient background
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Avatar silhouette icon
  const cx = x + w / 2;
  const cy = y + h * 0.38;
  const headR = Math.min(w, h) * 0.18;

  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(cx, cy, headR, 0, Math.PI * 2);
  ctx.fill();

  // Shoulder arch
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.95, w * 0.32, Math.PI, 0);
  ctx.fill();

  // Initials badge
  const initials = person.fullName
    ? person.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'ID';

  ctx.fillStyle = '#84a92c';
  ctx.font = `bold ${Math.max(10, Math.round(w * 0.14))}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, cx, cy);

  ctx.restore();
}

/**
 * Creates linear/radial multi-stop gradient or solid fill on canvas context.
 */
function applyFillStyle(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (
    el.fillType === 'linear-gradient' ||
    el.fillType === 'radial-gradient' ||
    (el.gradientStart && el.gradientEnd)
  ) {
    const angleRad = ((el.gradientAngle || 0) * Math.PI) / 180;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const len = Math.max(w, h) / 2;
    const x0 = cx - Math.cos(angleRad) * len;
    const y0 = cy - Math.sin(angleRad) * len;
    const x1 = cx + Math.cos(angleRad) * len;
    const y1 = cy + Math.sin(angleRad) * len;

    let grad: CanvasGradient;
    if (el.fillType === 'radial-gradient') {
      grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, len);
    } else {
      grad = ctx.createLinearGradient(x0, y0, x1, y1);
    }

    if (el.gradientStops && el.gradientStops.length >= 2) {
      el.gradientStops.forEach(s => {
        grad.addColorStop(s.offset, s.color);
      });
    } else {
      grad.addColorStop(0, el.gradientStart || '#3b82f6');
      grad.addColorStop(1, el.gradientEnd || '#9333ea');
    }
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = el.fill || '#14213D';
  }
}

/**
 * Applies shadow if configured on element.
 */
function applyShadow(ctx: CanvasRenderingContext2D, el: CanvasElement, scale: number) {
  if (el.shadowEnabled) {
    ctx.shadowColor = el.shadowColor || 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = (el.shadowBlur ?? 10) * scale;
    ctx.shadowOffsetX = (el.shadowOffsetX ?? 4) * scale;
    ctx.shadowOffsetY = (el.shadowOffsetY ?? 4) * scale;
  }
}

/**
 * Core vector drawing switch — renders any single CanvasElement onto HTML5 canvas.
 */
export async function renderSingleCanvasElement(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  person: Person,
  scaleX: number,
  scaleY: number
) {
  if (el.visible === false) return;

  const elX = (el.x || 0) * scaleX;
  const elY = (el.y || 0) * scaleY;
  const elW = Math.max(2, (el.width || 100) * scaleX);
  const elH = Math.max(2, (el.height || 60) * scaleY);
  const strokeW = Math.max(0.5, (el.strokeWidth || 1) * scaleX);

  ctx.save();
  ctx.globalAlpha = el.opacity ?? 1;

  // Rotation around element center
  if (el.rotation) {
    const cx = elX + elW / 2;
    const cy = elY + elH / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // Flipping / Mirroring
  if (el.flipX || el.flipY) {
    const cx = elX + elW / 2;
    const cy = elY + elH / 2;
    ctx.translate(cx, cy);
    ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
    ctx.translate(-cx, -cy);
  }

  applyShadow(ctx, el, scaleX);

  switch (el.type) {
    // -------------------------------------------------------------
    // TEXT & DATA BINDINGS
    // -------------------------------------------------------------
    case 'text':
    case 'dataField':
    case 'heading':
    case 'subtext':
    case 'mono': {
      let txt = el.text || '';
      if (el.dataField) txt = hydrateText(el.dataField, person);
      else txt = hydrateText(txt, person);

      if (el.textTransform === 'uppercase') txt = txt.toUpperCase();
      else if (el.textTransform === 'lowercase') txt = txt.toLowerCase();
      else if (el.textTransform === 'capitalize') txt = txt.replace(/\b\w/g, c => c.toUpperCase());

      const fontSize = Math.round((el.fontSize || 16) * scaleX);
      const fontFam = el.fontFamily || 'Inter';
      const fontSty = el.fontStyle || el.fontWeight || 'normal';

      if (el.textBackground) {
        ctx.fillStyle = el.textBackground;
        ctx.fillRect(elX - 4 * scaleX, elY, elW + 8 * scaleX, fontSize * 1.3);
      }

      ctx.fillStyle = el.fill || '#0f172a';
      ctx.font = `${fontSty} ${fontSize}px "${fontFam}", sans-serif`;
      ctx.textAlign = (el.align as CanvasTextAlign) || 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(txt, elX, elY);

      if (el.textDecoration === 'underline') {
        const textWidth = ctx.measureText(txt).width;
        ctx.strokeStyle = el.fill || '#0f172a';
        ctx.lineWidth = Math.max(1, fontSize * 0.08);
        ctx.beginPath();
        ctx.moveTo(elX, elY + fontSize + 2 * scaleY);
        ctx.lineTo(elX + textWidth, elY + fontSize + 2 * scaleY);
        ctx.stroke();
      }
      break;
    }

    // -------------------------------------------------------------
    // PHOTO FRAME & AVATAR (with all frame shape presets & real person photo)
    // -------------------------------------------------------------
    case 'photo':
    case 'frame': {
      const isPhotoFrame = el.type === 'photo' || el.type === 'frame' || el.isFrame || el.dataField === '{{photo}}';
      const frameShape = el.frameShape || el.shapePreset || (el.isCircle ? 'circle' : 'rounded');
      const rad = (typeof el.cornerRadius === 'number' ? el.cornerRadius : 10) * scaleX;
      const rTL = (el.radiusTL !== undefined ? el.radiusTL : (typeof el.cornerRadius === 'number' ? el.cornerRadius : 10)) * scaleX;
      const rTR = (el.radiusTR !== undefined ? el.radiusTR : (typeof el.cornerRadius === 'number' ? el.cornerRadius : 10)) * scaleX;
      const rBR = (el.radiusBR !== undefined ? el.radiusBR : (typeof el.cornerRadius === 'number' ? el.cornerRadius : 10)) * scaleX;
      const rBL = (el.radiusBL !== undefined ? el.radiusBL : (typeof el.cornerRadius === 'number' ? el.cornerRadius : 10)) * scaleX;

      const clipPhotoPath = () => {
        ctx.beginPath();
        if (frameShape === 'circle' || frameShape === 'frame-circle' || el.isCircle) {
          const r = Math.min(elW, elH) / 2;
          ctx.arc(elX + elW / 2, elY + elH / 2, r, 0, Math.PI * 2);
        } else if (frameShape === 'arch' || frameShape === 'frame-arch') {
          ctx.moveTo(elX, elY + elH);
          ctx.lineTo(elX, elY + elW / 2);
          ctx.arc(elX + elW / 2, elY + elW / 2, elW / 2, Math.PI, 0, false);
          ctx.lineTo(elX + elW, elY + elH);
          ctx.closePath();
        } else if (frameShape === 'hexagon' || frameShape === 'frame-hexagon') {
          const cx = elX + elW / 2;
          const cy = elY + elH / 2;
          const r = Math.min(elW, elH) / 2;
          for (let i = 0; i < 6; i++) {
            const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        } else if (frameShape === 'shield' || frameShape === 'frame-shield') {
          ctx.moveTo(elX + elW / 2, elY);
          ctx.lineTo(elX + elW, elY + elH * 0.2);
          ctx.lineTo(elX + elW * 0.85, elY + elH * 0.72);
          ctx.lineTo(elX + elW / 2, elY + elH);
          ctx.lineTo(elX + elW * 0.15, elY + elH * 0.72);
          ctx.lineTo(elX, elY + elH * 0.2);
          ctx.closePath();
        } else if (frameShape === 'heart' || frameShape === 'frame-heart') {
          const topCurveH = elH * 0.3;
          ctx.moveTo(elX + elW / 2, elY + topCurveH);
          ctx.bezierCurveTo(elX + elW / 2, elY, elX, elY, elX, elY + topCurveH);
          ctx.bezierCurveTo(elX, elY + (elH + topCurveH) / 2, elX + elW / 2, elY + (elH + topCurveH) / 2, elX + elW / 2, elY + elH);
          ctx.bezierCurveTo(elX + elW / 2, elY + (elH + topCurveH) / 2, elX + elW, elY + (elH + topCurveH) / 2, elX + elW, elY + topCurveH);
          ctx.bezierCurveTo(elX + elW, elY, elX + elW / 2, elY, elX + elW / 2, elY + topCurveH);
          ctx.closePath();
        } else if (frameShape === 'diamond' || frameShape === 'frame-diamond') {
          ctx.moveTo(elX + elW / 2, elY);
          ctx.lineTo(elX + elW, elY + elH / 2);
          ctx.lineTo(elX + elW / 2, elY + elH);
          ctx.lineTo(elX, elY + elH / 2);
          ctx.closePath();
        } else {
          if (ctx.roundRect) {
            ctx.roundRect(elX, elY, elW, elH, [rTL, rTR, rBR, rBL]);
          } else {
            ctx.rect(elX, elY, elW, elH);
          }
        }
      };

      ctx.save();
      clipPhotoPath();
      ctx.clip();

      const photoSource = person.photoDataUrl || el.src;
      if (photoSource) {
        try {
          const img = await getCachedImage(photoSource);
          if (el.cropWidth && el.cropHeight) {
            ctx.drawImage(
              img,
              el.cropX || 0,
              el.cropY || 0,
              el.cropWidth,
              el.cropHeight,
              elX,
              elY,
              elW,
              elH
            );
          } else {
            ctx.drawImage(img, elX, elY, elW, elH);
          }
        } catch {
          renderFallbackAvatar(ctx, person, elX, elY, elW, elH);
        }
      } else if (person.fullName) {
        renderFallbackAvatar(ctx, person, elX, elY, elW, elH);
      } else {
        // Classic Canva Sky + Cloud + Green Hills Placeholder (Image 3)
        const skyGrad = ctx.createLinearGradient(elX, elY, elX, elY + elH);
        skyGrad.addColorStop(0, '#7bb7fa');
        skyGrad.addColorStop(0.6, '#bce6fb');
        skyGrad.addColorStop(1, '#e3f4fc');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(elX, elY, elW, elH);

        // Fluffy Cloud
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        const cx = elX + elW * 0.5;
        const cy = elY + elH * 0.32;
        const cr = Math.min(elW, elH) * 0.15;
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.arc(cx - cr * 0.75, cy + cr * 0.3, cr * 0.65, 0, Math.PI * 2);
        ctx.arc(cx + cr * 0.75, cy + cr * 0.3, cr * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Back Hill
        ctx.fillStyle = '#8dc63f';
        ctx.beginPath();
        ctx.moveTo(elX - elW * 0.1, elY + elH * 1.1);
        ctx.quadraticCurveTo(elX + elW * 0.3, elY + elH * 0.55, elX + elW * 0.7, elY + elH * 0.8);
        ctx.quadraticCurveTo(elX + elW * 0.9, elY + elH * 0.95, elX + elW * 1.1, elY + elH * 1.1);
        ctx.lineTo(elX - elW * 0.1, elY + elH * 1.1);
        ctx.fill();

        // Front Hill
        ctx.fillStyle = '#689f1f';
        ctx.beginPath();
        ctx.moveTo(elX + elW * 1.1, elY + elH * 1.1);
        ctx.quadraticCurveTo(elX + elW * 0.7, elY + elH * 0.6, elX + elW * 0.2, elY + elH * 0.75);
        ctx.quadraticCurveTo(elX, elY + elH * 0.8, elX - elW * 0.1, elY + elH * 1.1);
        ctx.lineTo(elX + elW * 1.1, elY + elH * 1.1);
        ctx.fill();
      }
      ctx.restore();

      // Border stroke
      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        clipPhotoPath();
        ctx.stroke();
      }
      break;
    }

    // -------------------------------------------------------------
    // RECTANGLES & BASIC SHAPES
    // -------------------------------------------------------------
    case 'rect': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const rad = (typeof el.cornerRadius === 'number' ? el.cornerRadius : 0) * scaleX;
      const rTL = (el.radiusTL !== undefined ? el.radiusTL : rad) * scaleX;
      const rTR = (el.radiusTR !== undefined ? el.radiusTR : rad) * scaleX;
      const rBR = (el.radiusBR !== undefined ? el.radiusBR : rad) * scaleX;
      const rBL = (el.radiusBL !== undefined ? el.radiusBL : rad) * scaleX;

      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(elX, elY, elW, elH, [rTL, rTR, rBR, rBL]);
      else ctx.rect(elX, elY, elW, elH);
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        if (el.dashPattern) ctx.setLineDash(el.dashPattern.map(d => d * scaleX));
        ctx.stroke();
      }
      break;
    }

    case 'pill': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const rad = elH / 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(elX, elY, elW, elH, rad);
      else ctx.rect(elX, elY, elW, elH);
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }

      if (el.text) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.round((el.fontSize || 11) * scaleX)}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.text, elX + elW / 2, elY + elH / 2);
      }
      break;
    }

    case 'circle': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const rad = Math.min(elW, elH) / 2;
      ctx.beginPath();
      ctx.arc(elX + elW / 2, elY + elH / 2, rad, 0, Math.PI * 2);
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        if (el.dashPattern) ctx.setLineDash(el.dashPattern.map(d => d * scaleX));
        ctx.stroke();
      }
      break;
    }

    case 'ellipse': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const rx = elW / 2;
      const ry = elH / 2;
      ctx.beginPath();
      ctx.ellipse(elX + rx, elY + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'ring': {
      const outerR = Math.min(elW, elH) / 2;
      const innerR = (el.innerRadius ? el.innerRadius * scaleX : outerR * 0.65);
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      ctx.beginPath();
      ctx.arc(elX + elW / 2, elY + elH / 2, outerR, 0, Math.PI * 2, false);
      ctx.arc(elX + elW / 2, elY + elH / 2, innerR, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'diamond': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      ctx.beginPath();
      ctx.moveTo(elX + elW / 2, elY);
      ctx.lineTo(elX + elW, elY + elH / 2);
      ctx.lineTo(elX + elW / 2, elY + elH);
      ctx.lineTo(elX, elY + elH / 2);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'star': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const cx = elX + elW / 2;
      const cy = elY + elH / 2;
      const numPoints = el.starPoints || 5;
      const outerR = Math.min(elW, elH) / 2;
      const innerR = (el.innerRadius ? el.innerRadius * scaleX : outerR * 0.42);

      ctx.beginPath();
      for (let i = 0; i < numPoints * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / numPoints - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'heart': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const topCurveHeight = elH * 0.3;
      ctx.beginPath();
      ctx.moveTo(elX + elW / 2, elY + topCurveHeight);
      ctx.bezierCurveTo(elX + elW / 2, elY, elX, elY, elX, elY + topCurveHeight);
      ctx.bezierCurveTo(elX, elY + (elH + topCurveHeight) / 2, elX + elW / 2, elY + (elH + topCurveHeight) / 2, elX + elW / 2, elY + elH);
      ctx.bezierCurveTo(elX + elW / 2, elY + (elH + topCurveHeight) / 2, elX + elW, elY + (elH + topCurveHeight) / 2, elX + elW, elY + topCurveHeight);
      ctx.bezierCurveTo(elX + elW, elY, elX + elW / 2, elY, elX + elW / 2, elY + topCurveHeight);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'cloud': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      ctx.beginPath();
      ctx.moveTo(elX + elW * 0.2, elY + elH * 0.7);
      ctx.bezierCurveTo(elX, elY + elH * 0.7, elX, elY + elH * 0.4, elX + elW * 0.2, elY + elH * 0.4);
      ctx.bezierCurveTo(elX + elW * 0.2, elY + elH * 0.15, elX + elW * 0.5, elY + elH * 0.15, elX + elW * 0.5, elY + elH * 0.35);
      ctx.bezierCurveTo(elX + elW * 0.65, elY + elH * 0.2, elX + elW * 0.85, elY + elH * 0.35, elX + elW * 0.8, elY + elH * 0.55);
      ctx.bezierCurveTo(elX + elW, elY + elH * 0.55, elX + elW, elY + elH * 0.75, elX + elW * 0.8, elY + elH * 0.75);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'lightning': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      ctx.beginPath();
      ctx.moveTo(elX + elW * 0.55, elY);
      ctx.lineTo(elX + elW * 0.15, elY + elH * 0.55);
      ctx.lineTo(elX + elW * 0.45, elY + elH * 0.55);
      ctx.lineTo(elX + elW * 0.35, elY + elH);
      ctx.lineTo(elX + elW * 0.85, elY + elH * 0.4);
      ctx.lineTo(elX + elW * 0.55, elY + elH * 0.4);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'speechBubble': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const rad = 10 * scaleX;
      const bubbleH = elH * 0.8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(elX, elY, elW, bubbleH, rad);
      else ctx.rect(elX, elY, elW, bubbleH);
      // Pointer triangle
      ctx.moveTo(elX + elW * 0.25, elY + bubbleH);
      ctx.lineTo(elX + elW * 0.2, elY + elH);
      ctx.lineTo(elX + elW * 0.4, elY + bubbleH);
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'parallelogram': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const skew = elW * 0.22;
      ctx.beginPath();
      ctx.moveTo(elX + skew, elY);
      ctx.lineTo(elX + elW, elY);
      ctx.lineTo(elX + elW - skew, elY + elH);
      ctx.lineTo(elX, elY + elH);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'semiCircle': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      ctx.beginPath();
      ctx.arc(elX + elW / 2, elY + elH, elW / 2, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'crescent': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const r = Math.min(elW, elH) / 2;
      ctx.beginPath();
      ctx.arc(elX + elW / 2, elY + elH / 2, r, 0, Math.PI * 2, false);
      ctx.arc(elX + elW * 0.35, elY + elH * 0.45, r * 0.85, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'shield':
    case 'badgeShield': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      ctx.beginPath();
      ctx.moveTo(elX + elW / 2, elY);
      ctx.lineTo(elX + elW, elY + elH * 0.2);
      ctx.lineTo(elX + elW * 0.85, elY + elH * 0.72);
      ctx.lineTo(elX + elW / 2, elY + elH);
      ctx.lineTo(elX + elW * 0.15, elY + elH * 0.72);
      ctx.lineTo(elX, elY + elH * 0.2);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'polygon':
    case 'octagon':
    case 'hexagon': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const sides = el.type === 'octagon' ? 8 : (el.type === 'hexagon' ? 6 : (el.sides || 6));
      const cx = elX + elW / 2;
      const cy = elY + elH / 2;
      const rad = Math.min(elW, elH) / 2;

      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        const px = cx + Math.cos(angle) * rad;
        const py = cy + Math.sin(angle) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'trapezoid': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      ctx.beginPath();
      ctx.moveTo(elX + elW * 0.18, elY);
      ctx.lineTo(elX + elW * 0.82, elY);
      ctx.lineTo(elX + elW, elY + elH);
      ctx.lineTo(elX, elY + elH);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'chevron': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      ctx.beginPath();
      ctx.moveTo(elX, elY);
      ctx.lineTo(elX + elW * 0.75, elY);
      ctx.lineTo(elX + elW, elY + elH / 2);
      ctx.lineTo(elX + elW * 0.75, elY + elH);
      ctx.lineTo(elX, elY + elH);
      ctx.lineTo(elX + elW * 0.25, elY + elH / 2);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'cross': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const armW = elW * 0.33;
      const armH = elH * 0.33;
      ctx.beginPath();
      ctx.moveTo(elX + armW, elY);
      ctx.lineTo(elX + elW - armW, elY);
      ctx.lineTo(elX + elW - armW, elY + armH);
      ctx.lineTo(elX + elW, elY + armH);
      ctx.lineTo(elX + elW, elY + elH - armH);
      ctx.lineTo(elX + elW - armW, elY + elH - armH);
      ctx.lineTo(elX + elW - armW, elY + elH);
      ctx.lineTo(elX + armW, elY + elH);
      ctx.lineTo(elX + armW, elY + elH - armH);
      ctx.lineTo(elX, elY + elH - armH);
      ctx.lineTo(elX, elY + armH);
      ctx.lineTo(elX + armW, elY + armH);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    case 'ribbon': {
      applyFillStyle(ctx, el, elX, elY, elW, elH);
      const cut = elH * 0.3;
      ctx.beginPath();
      ctx.moveTo(elX, elY);
      ctx.lineTo(elX + elW, elY);
      ctx.lineTo(elX + elW - cut, elY + elH / 2);
      ctx.lineTo(elX + elW, elY + elH);
      ctx.lineTo(elX, elY + elH);
      ctx.lineTo(elX + cut, elY + elH / 2);
      ctx.closePath();
      ctx.fill();

      if (el.stroke && el.strokeWidth) {
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = strokeW;
        ctx.stroke();
      }
      break;
    }

    // -------------------------------------------------------------
    // LINES & ARROWS
    // -------------------------------------------------------------
    case 'line':
    case 'arrow': {
      ctx.strokeStyle = el.stroke || el.fill || '#0f172a';
      ctx.lineWidth = strokeW;
      if (el.dashPattern) ctx.setLineDash(el.dashPattern.map(d => d * scaleX));

      ctx.beginPath();
      if (el.points && el.points.length >= 4) {
        ctx.moveTo(elX + el.points[0] * scaleX, elY + el.points[1] * scaleY);
        ctx.lineTo(elX + el.points[2] * scaleX, elY + el.points[3] * scaleY);
      } else {
        ctx.moveTo(elX, elY + elH / 2);
        ctx.lineTo(elX + elW, elY + elH / 2);
      }
      ctx.stroke();

      if (el.type === 'arrow' || el.arrowHead) {
        const endX = el.points && el.points.length >= 4 ? elX + el.points[2] * scaleX : elX + elW;
        const endY = el.points && el.points.length >= 4 ? elY + el.points[3] * scaleY : elY + elH / 2;
        const arrowSize = 10 * scaleX;
        ctx.fillStyle = el.stroke || el.fill || '#0f172a';
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - arrowSize, endY - arrowSize / 2);
        ctx.lineTo(endX - arrowSize, endY + arrowSize / 2);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    // -------------------------------------------------------------
    // SECURITY GRAPHICS & METALLIC BADGES
    // -------------------------------------------------------------
    case 'chip': {
      // Smart EMV Gold Chip
      const rad = 6 * scaleX;
      const grad = ctx.createLinearGradient(elX, elY, elX + elW, elY + elH);
      grad.addColorStop(0, '#F59E0B');
      grad.addColorStop(0.5, '#FDE68A');
      grad.addColorStop(1, '#D97706');
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(elX, elY, elW, elH, rad);
      else ctx.rect(elX, elY, elW, elH);
      ctx.fill();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1.5 * scaleX;
      ctx.stroke();

      // Contact cuts
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1 * scaleX;
      ctx.beginPath();
      ctx.moveTo(elX, elY + elH * 0.35);
      ctx.lineTo(elX + elW * 0.45, elY + elH * 0.35);
      ctx.lineTo(elX + elW * 0.45, elY + elH * 0.65);
      ctx.lineTo(elX, elY + elH * 0.65);
      ctx.moveTo(elX + elW, elY + elH * 0.35);
      ctx.lineTo(elX + elW * 0.55, elY + elH * 0.35);
      ctx.lineTo(elX + elW * 0.55, elY + elH * 0.65);
      ctx.lineTo(elX + elW, elY + elH * 0.65);
      ctx.moveTo(elX + elW * 0.5, elY);
      ctx.lineTo(elX + elW * 0.5, elY + elH * 0.35);
      ctx.moveTo(elX + elW * 0.5, elY + elH * 0.65);
      ctx.lineTo(elX + elW * 0.5, elY + elH);
      ctx.stroke();
      break;
    }

    case 'hologram': {
      // Holographic Rainbow Foil Strip
      const grad = ctx.createLinearGradient(elX, elY, elX + elW, elY);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
      grad.addColorStop(0.2, 'rgba(245, 158, 11, 0.45)');
      grad.addColorStop(0.4, 'rgba(16, 185, 129, 0.45)');
      grad.addColorStop(0.6, 'rgba(6, 182, 212, 0.45)');
      grad.addColorStop(0.8, 'rgba(99, 102, 241, 0.45)');
      grad.addColorStop(1, 'rgba(236, 72, 153, 0.45)');

      ctx.fillStyle = grad;
      ctx.fillRect(elX, elY, elW, elH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1 * scaleX;
      ctx.strokeRect(elX, elY, elW, elH);

      // Micro hologram text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = `bold ${Math.max(8, Math.round(9 * scaleX))}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ SECURE ★ VERIFIED ★ AUTHENTIC ★', elX + elW / 2, elY + elH / 2);
      break;
    }

    case 'stamp':
    case 'seal': {
      // Official Circular Department Seal / Stamp
      const cx = elX + elW / 2;
      const cy = elY + elH / 2;
      const r = Math.min(elW, elH) / 2;
      ctx.strokeStyle = el.stroke || '#DC2626';
      ctx.lineWidth = 2 * scaleX;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = el.stroke || '#DC2626';
      ctx.font = `bold ${Math.max(7, Math.round(8 * scaleX))}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ OFFICIAL SEAL ★', cx, cy - r * 0.4);
      ctx.font = `bold ${Math.max(9, Math.round(11 * scaleX))}px "Inter", sans-serif`;
      ctx.fillText(el.text || 'AUTHORIZED', cx, cy);
      ctx.font = `${Math.max(6, Math.round(7 * scaleX))}px "Inter", sans-serif`;
      ctx.fillText('SECURE ISSUANCE', cx, cy + r * 0.4);
      break;
    }

    case 'rfid': {
      // Contactless RFID Wave Rings
      const cx = elX + elW * 0.3;
      const cy = elY + elH / 2;
      ctx.strokeStyle = el.stroke || '#84a92c';
      ctx.lineWidth = 2 * scaleX;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, i * 8 * scaleX, -Math.PI / 3, Math.PI / 3, false);
        ctx.stroke();
      }
      break;
    }

    case 'signature': {
      // Cardholder Signature Box
      ctx.fillStyle = el.fill || '#FFFFFF';
      ctx.fillRect(elX, elY, elW, elH);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1 * scaleX;
      ctx.strokeRect(elX, elY, elW, elH);

      // Signature baseline
      ctx.strokeStyle = '#475569';
      ctx.setLineDash([4 * scaleX, 2 * scaleX]);
      ctx.beginPath();
      ctx.moveTo(elX + 10 * scaleX, elY + elH * 0.75);
      ctx.lineTo(elX + elW - 10 * scaleX, elY + elH * 0.75);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#64748B';
      ctx.font = `${Math.max(7, Math.round(8 * scaleX))}px "Inter", sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('AUTHORIZED SIGNATURE', elX + 10 * scaleX, elY + elH * 0.88);
      break;
    }

    case 'guilloche':
    case 'securityGrid': {
      // Security Micro-Wave Texture / Guilloche Rosette
      ctx.strokeStyle = el.stroke || 'rgba(132, 169, 44, 0.35)';
      ctx.lineWidth = 0.8 * scaleX;
      const lines = 12;
      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        const yOffset = elY + (elH / lines) * i;
        ctx.moveTo(elX, yOffset);
        for (let x = 0; x <= elW; x += 15 * scaleX) {
          const waveY = yOffset + Math.sin((x / elW) * Math.PI * 4 + i) * 6 * scaleY;
          ctx.lineTo(elX + x, waveY);
        }
        ctx.stroke();
      }
      break;
    }

    // -------------------------------------------------------------
    // 3D-STYLED DIMENSIONAL GRAPHICS
    // -------------------------------------------------------------
    case 'shield3d': {
      // Dimensional 3D Heraldic Shield
      const cx = elX + elW / 2;
      // Outer shadow & border
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(cx, elY);
      ctx.lineTo(elX + elW, elY + elH * 0.2);
      ctx.lineTo(elX + elW * 0.85, elY + elH * 0.75);
      ctx.lineTo(cx, elY + elH);
      ctx.lineTo(elX + elW * 0.15, elY + elH * 0.75);
      ctx.lineTo(elX, elY + elH * 0.2);
      ctx.closePath();
      ctx.fill();

      // Left illuminated bevel
      const gradLeft = ctx.createLinearGradient(elX, elY, cx, elY + elH);
      gradLeft.addColorStop(0, '#3B82F6');
      gradLeft.addColorStop(1, '#1D4ED8');
      ctx.fillStyle = gradLeft;
      ctx.beginPath();
      ctx.moveTo(cx, elY + 4 * scaleY);
      ctx.lineTo(elX + 4 * scaleX, elY + elH * 0.2);
      ctx.lineTo(elX + elW * 0.17, elY + elH * 0.73);
      ctx.lineTo(cx, elY + elH - 4 * scaleY);
      ctx.closePath();
      ctx.fill();

      // Right shaded bevel
      const gradRight = ctx.createLinearGradient(cx, elY, elX + elW, elY + elH);
      gradRight.addColorStop(0, '#1E40AF');
      gradRight.addColorStop(1, '#172554');
      ctx.fillStyle = gradRight;
      ctx.beginPath();
      ctx.moveTo(cx, elY + 4 * scaleY);
      ctx.lineTo(elX + elW - 4 * scaleX, elY + elH * 0.2);
      ctx.lineTo(elX + elW * 0.83, elY + elH * 0.73);
      ctx.lineTo(cx, elY + elH - 4 * scaleY);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'star3d': {
      // 3D Faceted Dimensional Star
      const cx = elX + elW / 2;
      const cy = elY + elH / 2;
      const outerR = Math.min(elW, elH) / 2;
      const innerR = outerR * 0.42;
      const numPoints = 5;

      for (let i = 0; i < numPoints; i++) {
        const topAngle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
        const midAngle = topAngle + Math.PI / numPoints;
        const nextAngle = topAngle + (2 * Math.PI) / numPoints;

        const tipX = cx + Math.cos(topAngle) * outerR;
        const tipY = cy + Math.sin(topAngle) * outerR;
        const midX = cx + Math.cos(midAngle) * innerR;
        const midY = cy + Math.sin(midAngle) * innerR;

        // Light facet
        ctx.fillStyle = '#FDE047';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(midX, midY);
        ctx.closePath();
        ctx.fill();

        // Dark facet
        ctx.fillStyle = '#CA8A04';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(midX, midY);
        const nextTipX = cx + Math.cos(nextAngle) * outerR;
        const nextTipY = cy + Math.sin(nextAngle) * outerR;
        ctx.lineTo(nextTipX, nextTipY);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'badge3d': {
      // Dimensional 3D Metallic Medal
      const cx = elX + elW / 2;
      const cy = elY + elH / 2;
      const r = Math.min(elW, elH) / 2;

      // Outer gold bevel
      const gradOuter = ctx.createLinearGradient(elX, elY, elX + elW, elY + elH);
      gradOuter.addColorStop(0, '#FDE68A');
      gradOuter.addColorStop(0.5, '#D97706');
      gradOuter.addColorStop(1, '#78350F');
      ctx.fillStyle = gradOuter;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner disc
      const gradInner = ctx.createLinearGradient(elX, elY, elX + elW, elY + elH);
      gradInner.addColorStop(0, '#B45309');
      gradInner.addColorStop(1, '#F59E0B');
      ctx.fillStyle = gradInner;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
      ctx.fill();

      // Star emblem
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(r * 0.6)}px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', cx, cy);
      break;
    }

    // -------------------------------------------------------------
    // QR & BARCODES
    // -------------------------------------------------------------
    case 'qr':
    case 'qrCode': {
      try {
        const payload = el.qrPayload || el.dataField || `ID-${person.idNumber || '000'}`;
        const hydratedPayload = hydrateText(payload, person);
        const qrUrl = await generateQrDataUrl(hydratedPayload, Math.round(elW));
        const qrImg = await getCachedImage(qrUrl);
        ctx.drawImage(qrImg, elX, elY, elW, elH);
      } catch (err) {
        // Fallback placeholder
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(elX, elY, elW, elH);
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(elX, elY, elW, elH);
      }
      break;
    }

    case 'barcode': {
      try {
        const rawPayload = el.barcodeValue || el.dataField || el.text || person.idNumber || '00000000';
        const hydratedBarcode = hydrateText(rawPayload, person);
        const barcodeType = (el.barcodeType || 'code128').toLowerCase().trim();
        const barcodeUrl = await generateBarcodeDataUrl(
          hydratedBarcode,
          Math.round(elW),
          Math.round(elH),
          false,
          barcodeType
        );
        const barcodeImg = await getCachedImage(barcodeUrl);
        ctx.drawImage(barcodeImg, elX, elY, elW, elH);
      } catch (err) {
        // Fallback barcode placeholder
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(elX, elY, elW, elH);
        ctx.strokeStyle = '#0f172a';
        ctx.strokeRect(elX, elY, elW, elH);
      }
      break;
    }

    // -------------------------------------------------------------
    // RASTER IMAGES & BACKGROUND GRAPHICS
    // -------------------------------------------------------------
    case 'image': {
      if (el.src) {
        try {
          const img = await getCachedImage(el.src);
          if (el.cropWidth && el.cropHeight) {
            ctx.drawImage(
              img,
              el.cropX || 0,
              el.cropY || 0,
              el.cropWidth,
              el.cropHeight,
              elX,
              elY,
              elW,
              elH
            );
          } else {
            ctx.drawImage(img, elX, elY, elW, elH);
          }
        } catch {
          // Fallback box
          ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
          ctx.fillRect(elX, elY, elW, elH);
        }
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

/**
 * Universal Card Rendering Function.
 * Renders an entire card (background + all vector elements) into a high-res Data URL.
 */
export async function renderCardLayout(
  elements: CanvasElement[],
  person: Person,
  options: CardRenderOptions = {}
): Promise<string> {
  const baseW = options.widthPx || CARD.WIDTH_PX;
  const baseH = options.heightPx || CARD.HEIGHT_PX;
  const dpi = options.dpiScale || 1;

  const targetW = Math.round(baseW * dpi);
  const targetH = Math.round(baseH * dpi);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not obtain 2D canvas context for card rendering');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Draw Card Background
  ctx.fillStyle = options.backgroundColor || '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);

  // 2. Render each element in strict z-index order
  const scaleX = targetW / baseW;
  const scaleY = targetH / baseH;

  for (const el of elements) {
    await renderSingleCanvasElement(ctx, el, person, scaleX, scaleY);
  }

  // 3. Optional Watermark Overlay
  if (options.watermarkText) {
    ctx.save();
    ctx.font = `bold ${Math.round(28 * scaleX)}px "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(options.watermarkText.toUpperCase(), 0, 0);
    ctx.restore();
  }

  return canvas.toDataURL('image/png');
}
