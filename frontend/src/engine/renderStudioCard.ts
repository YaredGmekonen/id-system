import type { Person, CardTemplate, CanvasElement } from '../db/database';
import { generateQrDataUrl, generateBarcodeDataUrl } from './barcodeQr';
import { hydrateText, resolveQrPayload, resolveBarcodePayload } from './hydrateFields';
import { CARD } from '../design-tokens';
import { renderCardLayout } from './cardRenderer';

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
  /** Scale factor for DPI. 1 = screen (96 DPI), 3.125 = 300 DPI. Default: 1 */
  dpiScale?: number;
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
  const dpi = opts.dpiScale || 1;
  
  // Base dimensions at design resolution (CR80 standard ratio 1012x638)
  let baseWidth = isVertical ? 638 : 1012;
  let baseHeight = isVertical ? 1012 : 638;

  if (opts.customTemplate?.widthPx && opts.customTemplate?.heightPx) {
    baseWidth = Math.round(opts.customTemplate.widthPx);
    baseHeight = Math.round(opts.customTemplate.heightPx);
  }

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

    const baseDesignW = opts.customTemplate.widthPx || (isVertical ? CARD.HEIGHT_PX : CARD.WIDTH_PX);
    const baseDesignH = opts.customTemplate.heightPx || (isVertical ? CARD.WIDTH_PX : CARD.HEIGHT_PX);

    return await renderCardLayout(elements, person, {
      widthPx: baseDesignW,
      heightPx: baseDesignH,
      dpiScale: dpi,
      backgroundColor: bg,
    });
  }

  // 2. STANDARD BUILT-IN TEMPLATE ENGINE (CR80 High-Resolution Vector Synthesis)
  // Apply DPI scale to the backing canvas for crisp 300 DPI print quality
  const targetWidth = Math.round(baseWidth * dpi);
  const targetHeight = Math.round(baseHeight * dpi);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Scale context so that all drawing coordinates map accurately to logical baseWidth x baseHeight
  ctx.scale(dpi, dpi);

  const font = opts.fontFamily || 'Inter';

  if (side === 'front') {
    // 1. Background
    ctx.fillStyle = opts.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    // 2. Top Header Banner
    const headerHeight = isVertical ? 140 : 120;
    ctx.fillStyle = opts.headerColor || '#0b131b';
    ctx.fillRect(0, 0, baseWidth, headerHeight);

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
    ctx.font = `900 28px "${font}", sans-serif`;
    ctx.fillText('SILICON', 115, 58);
    ctx.fillStyle = '#9fe870';
    ctx.fillText('LABS', 115 + ctx.measureText('SILICON').width + 4, 58);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 13px 'JetBrains Mono', monospace`;
    ctx.fillText('CREDENTIAL PLATFORM', 115, 82);

    // Right-side chip / header badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(baseWidth - 180, 35, 150, 48);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(baseWidth - 180, 35, 150, 48);

    ctx.fillStyle = '#9fe870';
    ctx.font = `800 11px 'JetBrains Mono', monospace`;
    ctx.fillText('CR80 STANDARD', baseWidth - 165, 56);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `600 10px "${font}", sans-serif`;
    ctx.fillText('SECURE ENCLAVE', baseWidth - 165, 72);

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
    ctx.font = `900 38px "${font}", sans-serif`;
    ctx.fillText(person.fullName || 'Authorized Personnel', textStartX, textStartY);

    // Role / Title
    ctx.fillStyle = opts.accentColor || '#10b981';
    ctx.font = `800 22px "${font}", sans-serif`;
    ctx.fillText((person.role || 'Staff Member').toUpperCase(), textStartX, textStartY + 38);

    // Metadata lines
    ctx.fillStyle = '#334155';
    ctx.font = `600 18px "${font}", sans-serif`;

    const metaY = textStartY + 85;
    ctx.fillText(`ID NUMBER:`, textStartX, metaY);
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 18px 'JetBrains Mono', monospace`;
    ctx.fillText(person.idNumber || 'SL-2026-000', textStartX + 130, metaY);

    ctx.fillStyle = '#334155';
    ctx.font = `600 18px "${font}", sans-serif`;
    ctx.fillText(`DEPARTMENT:`, textStartX, metaY + 36);
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 18px "${font}", sans-serif`;
    ctx.fillText(person.department || 'General Operations', textStartX + 155, metaY + 36);

    if (person.phone) {
      ctx.fillStyle = '#334155';
      ctx.font = `600 18px "${font}", sans-serif`;
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
        ctx.font = `700 16px "${font}", sans-serif`;
        ctx.fillText(`• ${ct.text}`, textStartX, ctY);
        ctY += 24;
      });
    }

    // 5. QR Code
    if (opts.showQrCode !== false && !isVertical) {
      try {
        const qrUrl = await generateQrDataUrl(person.idNumber || 'ID-PLATFORM', 220);
        const qrImg = await loadImage(qrUrl);
        const qrX = baseWidth - 210;
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
    const footerY = baseHeight - footerHeight;
    ctx.fillStyle = opts.badgeColor || '#2e7d32';
    ctx.fillRect(0, footerY, baseWidth, footerHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 24px 'JetBrains Mono', monospace`;
    ctx.fillText('OFFICIAL CREDENTIAL', 40, footerY + 54);

    if (opts.showBarcode !== false) {
      try {
        const barcodeUrl = await generateBarcodeDataUrl(person.idNumber || '00000000', 260, 60, false);
        const barcodeImg = await loadImage(barcodeUrl);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(baseWidth - 290, footerY + 15, 260, 60);
        ctx.drawImage(barcodeImg, baseWidth - 285, footerY + 18, 250, 54);
      } catch {
        // Skip
      }
    }
  } else {
    // BACK SIDE
    ctx.fillStyle = opts.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    const headerHeight = 110;
    ctx.fillStyle = opts.headerColor || '#0b131b';
    ctx.fillRect(0, 0, baseWidth, headerHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 24px "${font}", sans-serif`;
    ctx.fillText('SILICONLABS TECH PLC', 40, 50);

    ctx.fillStyle = opts.accentColor || '#9fe870';
    ctx.font = `800 13px 'JetBrains Mono', monospace`;
    ctx.fillText('AUTHORIZED PERSONNEL CREDENTIAL & ACCESS PASS', 40, 78);

    const bodyY = headerHeight + 35;
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 18px "${font}", sans-serif`;
    ctx.fillText('TERMS & REGULATORY CONDITIONS:', 40, bodyY);

    ctx.fillStyle = '#334155';
    ctx.font = `500 16px "${font}", sans-serif`;
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
      ctx.drawImage(qrImg, baseWidth - 210, bodyY - 10, 160, 160);
      ctx.fillStyle = '#64748b';
      ctx.font = `700 10px 'JetBrains Mono', monospace`;
      ctx.fillText('SCAN TO VALIDATE', baseWidth - 200, bodyY + 165);
    } catch {
      // Skip
    }

    const footerHeight = 70;
    const footerY = baseHeight - footerHeight;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, footerY, baseWidth, footerHeight);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, footerY, baseWidth, footerHeight);

    ctx.fillStyle = '#475569';
    ctx.font = `700 13px 'JetBrains Mono', monospace`;
    ctx.fillText(`SERIAL: SL-ETH-2026-${person.id || 101}`, 40, footerY + 42);

    ctx.fillStyle = opts.accentColor || '#10b981';
    ctx.font = `800 13px 'JetBrains Mono', monospace`;
    ctx.fillText('VERIFIED & ENCRYPTED BY CTO ENCLAVE', baseWidth - 380, footerY + 42);
  }

  if (opts.showBorders !== false) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, baseWidth, baseHeight);
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
  ctx.font = `900 64px "${font}", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(initials, x + w / 2, y + h / 2 + 20);
  ctx.textAlign = 'left';

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}
