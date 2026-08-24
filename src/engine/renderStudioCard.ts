import type { Person, CardTemplate, CanvasElement } from '../db/database';
import { generateQrDataUrl, generateBarcodeDataUrl } from './barcodeQr';
import { CARD } from '../design-tokens';

export interface StudioCardOptions {
  orientation: 'horizontal' | 'vertical';
  backgroundColor: string;
  fontFamily: string;
  headerColor: string;
  accentColor: string;
  badgeColor: string;
  cornerRadius?: number;
  showBorders?: boolean;
  showPhoto?: boolean;
  showQrCode?: boolean;
  showBarcode?: boolean;
  customTexts?: { id: string; text: string; x?: number; y?: number }[];
  customTemplate?: CardTemplate;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for non-data URLs — setting it on data: URIs
    // can taint the canvas in some browsers, causing toDataURL() to throw.
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.substring(0, 60)}...`));
    img.src = src;
  });
}

function replacePlaceholders(text: string, person: Person): string {
  const parts = (person.fullName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://id-system-theta.vercel.app';
  const verifyUrl = `${origin}/verify/${person.idNumber || person.id || 'ID-2026-081'}`;

  return text
    .replace(/\{\{verify_url\}\}/gi, verifyUrl)
    .replace(/\{\{full_name\}\}/gi, person.fullName || '')
    .replace(/\{\{name\}\}/gi, person.fullName || '')
    .replace(/\{\{first_name\}\}/gi, firstName)
    .replace(/\{\{last_name\}\}/gi, lastName)
    .replace(/\{\{id_number\}\}/gi, person.idNumber || '')
    .replace(/\{\{id\}\}/gi, person.idNumber || '')
    .replace(/\{\{department\}\}/gi, person.department || '')
    .replace(/\{\{role\}\}/gi, person.role || '')
    .replace(/\{\{phone\}\}/gi, person.phone || '')
    .replace(/\{\{email\}\}/gi, person.email || '')
    .replace(/\{\{blood_group\}\}/gi, person.bloodGroup || 'O+')
    .replace(/\{\{joined_date\}\}/gi, person.joinedDate || '')
    .replace(/\{\{status\}\}/gi, person.status || 'Active');
}

/**
 * High-resolution 300 DPI canvas renderer for ID Card Studio (Front and Back faces).
 * Renders both standard built-in styles and Custom Vector Templates designed in Canvas Designer.
 */
export async function renderStudioCard(
  person: Person,
  side: 'front' | 'back',
  opts: StudioCardOptions
): Promise<string> {
  try {
    return await _renderStudioCardInner(person, side, opts);
  } catch (err) {
    console.error(`[renderStudioCard] Failed for person ${person.id} (${person.fullName}), side=${side}:`, err);
    // Return a minimal error card instead of throwing, so PDF generation can continue
    const errCanvas = document.createElement('canvas');
    errCanvas.width = 1012;
    errCanvas.height = 638;
    const errCtx = errCanvas.getContext('2d')!;
    errCtx.fillStyle = '#FFFFFF';
    errCtx.fillRect(0, 0, 1012, 638);
    errCtx.fillStyle = '#DC2626';
    errCtx.font = 'bold 24px Inter, sans-serif';
    errCtx.fillText('Card Render Error', 40, 300);
    errCtx.fillStyle = '#64748b';
    errCtx.font = '16px Inter, sans-serif';
    errCtx.fillText(`${person.fullName || 'Unknown'} — ${err instanceof Error ? err.message : 'Unknown error'}`, 40, 340);
    return errCanvas.toDataURL('image/png');
  }
}

async function _renderStudioCardInner(
  person: Person,
  side: 'front' | 'back',
  opts: StudioCardOptions
): Promise<string> {
  const isVertical = opts.orientation === 'vertical' || opts.customTemplate?.orientation === 'vertical';
  
  // Base dimensions: if custom template specifies custom dimensions, use them (or scale to 300 DPI)
  let width = isVertical ? 638 : 1012;
  let height = isVertical ? 1012 : 638;

  if (opts.customTemplate?.widthPx && opts.customTemplate?.heightPx) {
    width = Math.round(opts.customTemplate.widthPx);
    height = Math.round(opts.customTemplate.heightPx);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. IF CUSTOM TEMPLATE FROM DESIGNER IS SELECTED
  if (opts.customTemplate) {
    const elements: CanvasElement[] =
      side === 'front'
        ? opts.customTemplate.frontElements || []
        : opts.customTemplate.backElements || [];

    const bg =
      side === 'front'
        ? opts.customTemplate.backgroundColor || '#FFFFFF'
        : opts.customTemplate.backBackgroundColor || '#FFFFFF';

    // Reference design coordinate space
    const baseDesignW = opts.customTemplate.widthPx || CARD.WIDTH_PX;
    const baseDesignH = opts.customTemplate.heightPx || CARD.HEIGHT_PX;
    const scaleFactorX = width / baseDesignW;
    const scaleFactorY = height / baseDesignH;

    // Draw Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const el of elements) {
      if (el.visible === false) continue;

      const elX = (el.x || 0) * scaleFactorX;
      const elY = (el.y || 0) * scaleFactorY;
      const elW = (el.width || 100) * scaleFactorX;
      const elH = (el.height || 60) * scaleFactorY;

      ctx.save();
      ctx.globalAlpha = el.opacity ?? 1;

      if (el.type === 'rect' || el.type === 'frame') {
        ctx.fillStyle = el.fill || '#14213D';
        const rad = (el.cornerRadius || 0) * scaleFactorX;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(elX, elY, elW, elH, rad);
        else ctx.rect(elX, elY, elW, elH);
        ctx.fill();

        if (el.stroke && el.strokeWidth) {
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = (el.strokeWidth || 1) * scaleFactorX;
          ctx.stroke();
        }
      } else if (el.type === 'circle') {
        const rad = (el.radius || 40) * scaleFactorX;
        ctx.fillStyle = el.fill || '#0F8B8D';
        ctx.beginPath();
        ctx.arc(elX + rad, elY + rad, rad, 0, Math.PI * 2);
        ctx.fill();
        if (el.stroke && el.strokeWidth) {
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = (el.strokeWidth || 1) * scaleFactorX;
          ctx.stroke();
        }
      } else if (el.type === 'line' || el.type === 'arrow') {
        ctx.strokeStyle = el.stroke || el.fill || '#0f172a';
        ctx.lineWidth = Math.max(1, (el.strokeWidth || 2) * scaleFactorX);
        ctx.beginPath();
        if (el.points && el.points.length >= 4) {
          ctx.moveTo(elX + el.points[0] * scaleFactorX, elY + el.points[1] * scaleFactorY);
          ctx.lineTo(elX + el.points[2] * scaleFactorX, elY + el.points[3] * scaleFactorY);
        } else {
          ctx.moveTo(elX, elY + elH / 2);
          ctx.lineTo(elX + elW, elY + elH / 2);
        }
        ctx.stroke();

        if (el.type === 'arrow' || el.arrowHead) {
          const endX = el.points && el.points.length >= 4 ? elX + el.points[2] * scaleFactorX : elX + elW;
          const endY = el.points && el.points.length >= 4 ? elY + el.points[3] * scaleFactorY : elY + elH / 2;
          const arrowSize = 10 * scaleFactorX;
          ctx.fillStyle = el.stroke || el.fill || '#0f172a';
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - arrowSize, endY - arrowSize / 2);
          ctx.lineTo(endX - arrowSize, endY + arrowSize / 2);
          ctx.closePath();
          ctx.fill();
        }
      } else if (el.type === 'text' || el.type === 'dataField') {
        let txt = el.text || '';
        if (el.dataField) txt = replacePlaceholders(el.dataField, person);
        else txt = replacePlaceholders(txt, person);

        const fontSize = Math.round((el.fontSize || 18) * scaleFactorX);
        const fontFam = el.fontFamily || 'Inter';
        const fontSty = el.fontStyle || 'normal';

        if (el.textBackground) {
          ctx.fillStyle = el.textBackground;
          ctx.fillRect(elX - 4 * scaleFactorX, elY, elW + 8 * scaleFactorX, fontSize * 1.3);
        }

        ctx.fillStyle = el.fill || '#0f172a';
        ctx.font = `${fontSty} ${fontSize}px "${fontFam}", sans-serif`;
        ctx.textAlign = (el.align as CanvasTextAlign) || 'left';
        ctx.fillText(txt, elX, elY + fontSize);

        if (el.textDecoration === 'underline') {
          const textWidth = ctx.measureText(txt).width;
          ctx.strokeStyle = el.fill || '#0f172a';
          ctx.lineWidth = Math.max(1, fontSize * 0.08);
          ctx.beginPath();
          ctx.moveTo(elX, elY + fontSize + 3);
          ctx.lineTo(elX + textWidth, elY + fontSize + 3);
          ctx.stroke();
        }
      } else if (el.type === 'photo') {
        const rad = (el.cornerRadius !== undefined ? el.cornerRadius : 12) * scaleFactorX;
        const drawPhoto = (img: HTMLImageElement | null) => {
          ctx.save();
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(elX, elY, elW, elH, rad);
          else ctx.rect(elX, elY, elW, elH);
          ctx.clip();

          if (img) {
            ctx.drawImage(img, elX, elY, elW, elH);
          } else {
            renderFallbackPhoto(ctx, person, elX, elY, elW, elH, 'Inter');
          }
          ctx.restore();

          if (el.stroke && el.strokeWidth) {
            ctx.strokeStyle = el.stroke;
            ctx.lineWidth = el.strokeWidth * scaleFactorX;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(elX, elY, elW, elH, rad);
            else ctx.rect(elX, elY, elW, elH);
            ctx.stroke();
          }
        };

        if (person.photoDataUrl) {
          try {
            const photoImg = await loadImage(person.photoDataUrl);
            drawPhoto(photoImg);
          } catch {
            drawPhoto(null);
          }
        } else {
          drawPhoto(null);
        }
      } else if (el.type === 'qr' || el.type === 'qrCode') {
        try {
          const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://id-system-theta.vercel.app';
          const defaultVerifyUrl = `${origin}/verify/${person.idNumber || person.id || 'ID-2026-081'}`;
          const payload = el.qrPayload ? replacePlaceholders(el.qrPayload, person) : defaultVerifyUrl;
          const qrUrl = await generateQrDataUrl(payload, Math.round(elW));
          const qrImg = await loadImage(qrUrl);
          ctx.drawImage(qrImg, elX, elY, elW, elH);
        } catch {
          // Skip
        }
      } else if (el.type === 'barcode') {
        try {
          const barcodeVal = el.dataField
            ? replacePlaceholders(el.dataField, person)
            : (person.idNumber || '00000000');
          const barcodeUrl = await generateBarcodeDataUrl(barcodeVal, Math.round(elW), Math.round(elH), false);
          const barcodeImg = await loadImage(barcodeUrl);
          ctx.drawImage(barcodeImg, elX, elY, elW, elH);
        } catch (err) {
          console.warn('[renderStudioCard] Barcode render failed:', err);
        }
      } else if (el.type === 'image' && el.src) {
        try {
          const img = await loadImage(el.src);
          ctx.drawImage(img, elX, elY, elW, elH);
        } catch {
          // Skip
        }
      } else if (el.type === 'star') {
        const cx = elX + elW / 2;
        const cy = elY + elH / 2;
        const numPoints = el.starPoints || 5;
        const outerR = Math.min(elW, elH) / 2;
        const innerR = (el.innerRadius || (outerR * 0.45));
        ctx.fillStyle = el.fill || '#F59E0B';
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
          ctx.lineWidth = (el.strokeWidth || 1) * scaleFactorX;
          ctx.stroke();
        }
      } else if (el.type === 'polygon') {
        const cx = elX + elW / 2;
        const cy = elY + elH / 2;
        const sides = el.sides || 6;
        const rad = Math.min(elW, elH) / 2;
        ctx.fillStyle = el.fill || '#3B82F6';
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          const x = cx + Math.cos(angle) * rad;
          const y = cy + Math.sin(angle) * rad;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        if (el.stroke && el.strokeWidth) {
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = (el.strokeWidth || 1) * scaleFactorX;
          ctx.stroke();
        }
      } else if (el.type === 'badgeShield') {
        // Heraldic / Security ID Shield
        ctx.fillStyle = el.fill || '#1E3A8A';
        ctx.beginPath();
        ctx.moveTo(elX + elW / 2, elY);
        ctx.lineTo(elX + elW, elY + elH * 0.2);
        ctx.lineTo(elX + elW * 0.85, elY + elH * 0.7);
        ctx.lineTo(elX + elW / 2, elY + elH);
        ctx.lineTo(elX + elW * 0.15, elY + elH * 0.7);
        ctx.lineTo(elX, elY + elH * 0.2);
        ctx.closePath();
        ctx.fill();
        if (el.stroke && el.strokeWidth) {
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = (el.strokeWidth || 1) * scaleFactorX;
          ctx.stroke();
        }
      } else if (el.type === 'chip') {
        // EMV Gold Smart Chip
        const rad = 6 * scaleFactorX;
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
        ctx.lineWidth = 1.5 * scaleFactorX;
        ctx.stroke();

        // Internal circuit contact cuts
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 1 * scaleFactorX;
        ctx.beginPath();
        ctx.moveTo(elX, elY + elH * 0.35);
        ctx.lineTo(elX + elW * 0.35, elY + elH * 0.35);
        ctx.lineTo(elX + elW * 0.35, elY + elH * 0.65);
        ctx.lineTo(elX, elY + elH * 0.65);

        ctx.moveTo(elX + elW, elY + elH * 0.35);
        ctx.lineTo(elX + elW * 0.65, elY + elH * 0.35);
        ctx.lineTo(elX + elW * 0.65, elY + elH * 0.65);
        ctx.lineTo(elX + elW, elY + elH * 0.65);

        ctx.moveTo(elX + elW * 0.5, elY);
        ctx.lineTo(elX + elW * 0.5, elY + elH * 0.35);

        ctx.moveTo(elX + elW * 0.5, elY + elH * 0.65);
        ctx.lineTo(elX + elW * 0.5, elY + elH);
        ctx.stroke();
      } else if (el.type === 'hologram') {
        // Iridescent Holographic Security Foil Strip
        const grad = ctx.createLinearGradient(elX, elY, elX + elW, elY + elH);
        grad.addColorStop(0, '#E0E7FF');
        grad.addColorStop(0.2, '#A7F3D0');
        grad.addColorStop(0.4, '#FDE68A');
        grad.addColorStop(0.6, '#FBCFE8');
        grad.addColorStop(0.8, '#BAE6FD');
        grad.addColorStop(1, '#DDD6FE');
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(elX, elY, elW, elH, 4 * scaleFactorX);
        else ctx.rect(elX, elY, elW, elH);
        ctx.fill();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 0.8 * scaleFactorX;
        ctx.stroke();

        // Micro-text pattern
        ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
        ctx.font = `bold ${Math.round(8 * scaleFactorX)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('VALID SECURE AUTH', elX + elW / 2, elY + elH / 2 + 3 * scaleFactorX);
      } else if (el.type === 'stamp') {
        // Official Circular Seal Stamp
        const cx = elX + elW / 2;
        const cy = elY + elH / 2;
        const rad = Math.min(elW, elH) / 2;
        const stampColor = el.stroke || el.fill || '#DC2626';

        ctx.strokeStyle = stampColor;
        ctx.lineWidth = 3 * scaleFactorX;
        ctx.beginPath();
        ctx.arc(cx, cy, rad - 2 * scaleFactorX, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 1 * scaleFactorX;
        ctx.beginPath();
        ctx.arc(cx, cy, rad - 8 * scaleFactorX, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = stampColor;
        ctx.font = `bold ${Math.round(9 * scaleFactorX)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('OFFICIAL', cx, cy - 8 * scaleFactorX);
        ctx.fillText('VERIFIED', cx, cy + 3 * scaleFactorX);
        ctx.fillText('AUTHENTIC', cx, cy + 13 * scaleFactorX);
      } else if (el.type === 'guilloche') {
        // Guilloche Security Wavy Border
        ctx.strokeStyle = el.stroke || el.fill || '#10B981';
        ctx.lineWidth = (el.strokeWidth || 1.2) * scaleFactorX;
        ctx.beginPath();
        const amplitude = elH / 4;
        const freq = (Math.PI * 6) / elW;
        for (let x = 0; x <= elW; x += 2) {
          const y = elY + elH / 2 + Math.sin(x * freq) * amplitude;
          if (x === 0) ctx.moveTo(elX + x, y);
          else ctx.lineTo(elX + x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        for (let x = 0; x <= elW; x += 2) {
          const y = elY + elH / 2 + Math.cos(x * freq) * amplitude;
          if (x === 0) ctx.moveTo(elX + x, y);
          else ctx.lineTo(elX + x, y);
        }
        ctx.stroke();
      } else if (el.type === 'rfid') {
        // Contactless NFC / RFID Wave Emblem
        const cx = elX + elW * 0.2;
        const cy = elY + elH / 2;
        ctx.strokeStyle = el.stroke || el.fill || '#2563EB';
        ctx.lineWidth = 2 * scaleFactorX;
        for (let i = 1; i <= 3; i++) {
          const r = i * (elW * 0.22);
          ctx.beginPath();
          ctx.arc(cx, cy, r, -Math.PI / 4, Math.PI / 4);
          ctx.stroke();
        }
      } else if (el.type === 'signature') {
        // Signature Line
        ctx.strokeStyle = el.stroke || '#0F172A';
        ctx.lineWidth = (el.strokeWidth || 1) * scaleFactorX;
        ctx.beginPath();
        ctx.moveTo(elX, elY + elH * 0.7);
        ctx.lineTo(elX + elW, elY + elH * 0.7);
        ctx.stroke();

        ctx.fillStyle = '#64748B';
        ctx.font = `${Math.round(9 * scaleFactorX)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(el.subText || 'Authorized Signature', elX + elW / 2, elY + elH * 0.95);
      } else if (el.type === 'pill') {
        const rad = elH / 2;
        ctx.fillStyle = el.fill || '#10B981';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(elX, elY, elW, elH, rad);
        else ctx.rect(elX, elY, elW, elH);
        ctx.fill();
        if (el.text) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${Math.round((el.fontSize || 12) * scaleFactorX)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(el.text, elX + elW / 2, elY + elH / 2 + (el.fontSize || 12) * 0.35 * scaleFactorX);
        }
      } else if (el.type === 'cornerBracket') {
        const arm = Math.min(elW, elH) * 0.3;
        ctx.strokeStyle = el.stroke || '#84A92C';
        ctx.lineWidth = (el.strokeWidth || 2) * scaleFactorX;
        // TL
        ctx.beginPath(); ctx.moveTo(elX, elY + arm); ctx.lineTo(elX, elY); ctx.lineTo(elX + arm, elY); ctx.stroke();
        // TR
        ctx.beginPath(); ctx.moveTo(elX + elW - arm, elY); ctx.lineTo(elX + elW, elY); ctx.lineTo(elX + elW, elY + arm); ctx.stroke();
        // BL
        ctx.beginPath(); ctx.moveTo(elX, elY + elH - arm); ctx.lineTo(elX, elY + elH); ctx.lineTo(elX + arm, elY + elH); ctx.stroke();
        // BR
        ctx.beginPath(); ctx.moveTo(elX + elW - arm, elY + elH); ctx.lineTo(elX + elW, elY + elH); ctx.lineTo(elX + elW, elY + elH - arm); ctx.stroke();
      }

      ctx.restore();
    }

    // Border
    if (opts.showBorders !== false) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, width, height);
    }

    return canvas.toDataURL('image/png', 0.95);
  }

  // 2. STANDARD BUILT-IN TEMPLATE ENGINE
  const font = opts.fontFamily || 'Inter';

  if (side === 'front') {
    // 1. Background
    ctx.fillStyle = opts.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // 2. Top Header Banner
    const headerHeight = isVertical ? 140 : 120;
    ctx.fillStyle = opts.headerColor || '#0b131b';
    ctx.fillRect(0, 0, width, headerHeight);

    // Header Logo & Branding
    try {
      const logoImg = await loadImage('/siliconlabs-logo.png');
      ctx.drawImage(logoImg, 30, 25, 70, 70);
    } catch {
      ctx.fillStyle = '#9fe870';
      ctx.beginPath();
      ctx.arc(65, 60, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 28px ${font}, sans-serif`;
    ctx.fillText('SILICON', 115, 58);
    ctx.fillStyle = '#9fe870';
    ctx.fillText('LABS', 115 + ctx.measureText('SILICON').width + 4, 58);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 13px 'JetBrains Mono', monospace`;
    ctx.fillText('CREDENTIAL PLATFORM', 115, 82);

    // Right-side chip / header badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(width - 180, 35, 150, 48);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(width - 180, 35, 150, 48);

    ctx.fillStyle = '#9fe870';
    ctx.font = `800 11px 'JetBrains Mono', monospace`;
    ctx.fillText('CR80 STANDARD', width - 165, 56);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `600 10px ${font}, sans-serif`;
    ctx.fillText('SECURE ENCLAVE', width - 165, 72);

    // 3. Photo Box
    const photoW = isVertical ? 240 : 250;
    const photoH = isVertical ? 300 : 310;
    const photoX = 40;
    const photoY = headerHeight + (isVertical ? 40 : 35);

    if (opts.showPhoto !== false) {
      if (person.photoDataUrl) {
        try {
          const photoImg = await loadImage(person.photoDataUrl);
          ctx.save();
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(photoX, photoY, photoW, photoH, 16);
          else ctx.rect(photoX, photoY, photoW, photoH);
          ctx.clip();
          ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
          ctx.restore();

          // Photo border
          ctx.strokeStyle = opts.accentColor || '#10b981';
          ctx.lineWidth = 3;
          ctx.strokeRect(photoX, photoY, photoW, photoH);
        } catch {
          renderFallbackPhoto(ctx, person, photoX, photoY, photoW, photoH, font);
        }
      } else {
        renderFallbackPhoto(ctx, person, photoX, photoY, photoW, photoH, font);
      }
    }

    // 4. Identity Text Fields
    const textStartX = opts.showPhoto !== false ? (isVertical ? 40 : 325) : 50;
    const textStartY = isVertical ? (photoY + photoH + 40) : (headerHeight + 65);

    // Full Name
    ctx.fillStyle = '#0f172a';
    ctx.font = `900 38px ${font}, sans-serif`;
    ctx.fillText(person.fullName || 'Authorized Personnel', textStartX, textStartY);

    // Role / Title
    ctx.fillStyle = opts.accentColor || '#10b981';
    ctx.font = `800 22px ${font}, sans-serif`;
    ctx.fillText((person.role || 'Staff Member').toUpperCase(), textStartX, textStartY + 38);

    // Metadata lines
    ctx.fillStyle = '#334155';
    ctx.font = `600 18px ${font}, sans-serif`;

    const metaY = textStartY + 85;
    ctx.fillText(`ID NUMBER:`, textStartX, metaY);
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 18px 'JetBrains Mono', monospace`;
    ctx.fillText(person.idNumber || 'SL-2026-000', textStartX + 130, metaY);

    ctx.fillStyle = '#334155';
    ctx.font = `600 18px ${font}, sans-serif`;
    ctx.fillText(`DEPARTMENT:`, textStartX, metaY + 36);
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 18px ${font}, sans-serif`;
    ctx.fillText(person.department || 'General Operations', textStartX + 155, metaY + 36);

    if (person.phone) {
      ctx.fillStyle = '#334155';
      ctx.font = `600 18px ${font}, sans-serif`;
      ctx.fillText(`CONTACT:`, textStartX, metaY + 72);
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 18px 'JetBrains Mono', monospace`;
      ctx.fillText(person.phone, textStartX + 120, metaY + 72);
    }

    // Custom text tags
    if (opts.customTexts && opts.customTexts.length > 0) {
      let ctY = metaY + (person.phone ? 105 : 72);
      opts.customTexts.forEach(ct => {
        ctx.fillStyle = '#0f172a';
        ctx.font = `700 16px ${font}, sans-serif`;
        ctx.fillText(`• ${ct.text}`, textStartX, ctY);
        ctY += 24;
      });
    }

    // 5. QR Code
    if (opts.showQrCode !== false && !isVertical) {
      try {
        const qrUrl = await generateQrDataUrl(person.idNumber || 'ID-PLATFORM', 220);
        const qrImg = await loadImage(qrUrl);
        const qrX = width - 210;
        const qrY = headerHeight + 50;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(qrX - 10, qrY - 10, 180, 180);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX - 10, qrY - 10, 180, 180);
        ctx.drawImage(qrImg, qrX, qrY, 160, 160);
      } catch {
        // Skip
      }
    }

    // 6. Bottom Banner & Barcode
    const footerHeight = 90;
    const footerY = height - footerHeight;
    ctx.fillStyle = opts.badgeColor || '#2e7d32';
    ctx.fillRect(0, footerY, width, footerHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 24px 'JetBrains Mono', monospace`;
    ctx.fillText('OFFICIAL CREDENTIAL', 40, footerY + 54);

    if (opts.showBarcode !== false) {
      try {
        const barcodeUrl = await generateBarcodeDataUrl(person.idNumber || '00000000', 260, 60, false);
        const barcodeImg = await loadImage(barcodeUrl);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(width - 290, footerY + 15, 260, 60);
        ctx.drawImage(barcodeImg, width - 285, footerY + 18, 250, 54);
      } catch {
        // Skip
      }
    }
  } else {
    // BACK SIDE
    ctx.fillStyle = opts.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const headerHeight = 110;
    ctx.fillStyle = opts.headerColor || '#0b131b';
    ctx.fillRect(0, 0, width, headerHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 24px ${font}, sans-serif`;
    ctx.fillText('SILICONLABS TECH PLC', 40, 50);

    ctx.fillStyle = opts.accentColor || '#9fe870';
    ctx.font = `800 13px 'JetBrains Mono', monospace`;
    ctx.fillText('AUTHORIZED PERSONNEL CREDENTIAL & ACCESS PASS', 40, 78);

    const bodyY = headerHeight + 35;
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 18px ${font}, sans-serif`;
    ctx.fillText('TERMS & REGULATORY CONDITIONS:', 40, bodyY);

    ctx.fillStyle = '#334155';
    ctx.font = `500 16px ${font}, sans-serif`;
    const lines = [
      '1. This credential is the official property of SiliconLabs Tech PLC.',
      '2. Must be visibly displayed at all times when inside company enclaves and field stations.',
      '3. Non-transferable. Misuse or forgery is strictly subject to legal prosecution.',
      '4. If found, please return immediately to Addis Ababa HQ, Around Ayat, or any branch kiosk.',
      '5. 24/7 Security Operations Center Contact: +251 906 634 621 | security@siliconlabs.internal',
    ];

    let lineY = bodyY + 36;
    lines.forEach(l => {
      ctx.fillText(l, 40, lineY);
      lineY += 28;
    });

    try {
      const qrUrl = await generateQrDataUrl(`VERIFY:${person.idNumber || '0000'}`, 180);
      const qrImg = await loadImage(qrUrl);
      ctx.drawImage(qrImg, width - 210, bodyY - 10, 160, 160);
      ctx.fillStyle = '#64748b';
      ctx.font = `700 10px 'JetBrains Mono', monospace`;
      ctx.fillText('SCAN TO VALIDATE', width - 200, bodyY + 165);
    } catch {
      // Skip
    }

    const footerHeight = 70;
    const footerY = height - footerHeight;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, footerY, width, footerHeight);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, footerY, width, footerHeight);

    ctx.fillStyle = '#475569';
    ctx.font = `700 13px 'JetBrains Mono', monospace`;
    ctx.fillText(`SERIAL: SL-ETH-2026-${person.id || 101}`, 40, footerY + 42);

    ctx.fillStyle = opts.accentColor || '#10b981';
    ctx.font = `800 13px 'JetBrains Mono', monospace`;
    ctx.fillText('VERIFIED & ENCRYPTED BY CTO ENCLAVE', width - 380, footerY + 42);
  }

  if (opts.showBorders !== false) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
  }

  return canvas.toDataURL('image/png', 0.95);
}

function renderFallbackPhoto(
  ctx: CanvasRenderingContext2D,
  person: Person,
  x: number,
  y: number,
  w: number,
  h: number,
  font: string
) {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  const initials = person.fullName
    ? person.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'ID';

  ctx.fillStyle = '#9fe870';
  ctx.font = `900 64px ${font}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(initials, x + w / 2, y + h / 2 + 20);
  ctx.textAlign = 'left';

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}
