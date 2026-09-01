import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { PRINT_SHEET, CARD } from '../design-tokens';

export interface CardSlotItem {
  name: string;
  side: 'front' | 'back';
  png: string;
  slotIndex?: number;
}

export interface PlacedPaperCard {
  id: string;
  name: string;
  side: 'front' | 'back';
  png: string;
  // Position in millimeters on the paper
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotationDeg?: number;
}

export interface PaperSheetConfig {
  paperName: string;
  widthMm: number;
  heightMm: number;
  orientation: 'portrait' | 'landscape';
  showCropMarks?: boolean;
  showCenterGuide?: boolean;
  showMetadata?: boolean;
}

const MM_TO_PT = 72 / 25.4; // 1 mm = 2.83465 PDF points

/**
 * Embeds an image data URL into a PDFDocument, auto-detecting PNG vs JPEG.
 */
async function embedImageDataUrl(pdfDoc: import('pdf-lib').PDFDocument, dataUrl: string) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Empty or invalid image data URL');
  }
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return await pdfDoc.embedJpg(dataUrl);
  }
  // Default: treat as PNG (covers data:image/png and raw base64)
  return await pdfDoc.embedPng(dataUrl);
}

/**
 * Generates a single-card PDF from front and optional back PNG data URLs.
 * CR80 Standard: 85.6mm x 54mm (3.375" x 2.125") at standard 72pt/inch coordinate space.
 */
export async function generateSingleCardPdf(
  frontPngDataUrl: string,
  backPngDataUrl?: string,
  dimensions?: { widthMm?: number; heightMm?: number; widthPt?: number; heightPt?: number }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Card dimensions in PDF points (72 pt / inch)
  let cardWidthPt = CARD.WIDTH_INCHES * 72;
  let cardHeightPt = CARD.HEIGHT_INCHES * 72;

  if (dimensions?.widthPt && dimensions?.heightPt) {
    cardWidthPt = dimensions.widthPt;
    cardHeightPt = dimensions.heightPt;
  } else if (dimensions?.widthMm && dimensions?.heightMm) {
    cardWidthPt = dimensions.widthMm * MM_TO_PT;
    cardHeightPt = dimensions.heightMm * MM_TO_PT;
  }

  // Front Page
  const frontPage = pdfDoc.addPage([cardWidthPt, cardHeightPt]);
  const frontPngImage = await embedImageDataUrl(pdfDoc, frontPngDataUrl);

  frontPage.drawImage(frontPngImage, {
    x: 0,
    y: 0,
    width: cardWidthPt,
    height: cardHeightPt,
  });

  // Optional Back Page
  if (backPngDataUrl) {
    const backPage = pdfDoc.addPage([cardWidthPt, cardHeightPt]);
    const backPngImage = await embedImageDataUrl(pdfDoc, backPngDataUrl);
    backPage.drawImage(backPngImage, {
      x: 0,
      y: 0,
      width: cardWidthPt,
      height: cardHeightPt,
    });
  }

  return await pdfDoc.save();
}

/**
 * Generates an 8-up A4 print sheet PDF from multiple card items.
 * Layout: 2 columns × 4 rows per A4 page.
 */
export async function generatePrintSheet(
  cardItems: CardSlotItem[],
  options: {
    showCropMarks?: boolean;
    pageTitle?: string;
  } = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { showCropMarks = true, pageTitle = 'SiliconLabs Production A4 Print Sheet' } = options;

  const { PAGE_WIDTH, PAGE_HEIGHT, CARDS_PER_ROW, CARDS_PER_COL, MARGIN, GAP } = PRINT_SHEET;
  const cardsPerPage = CARDS_PER_ROW * CARDS_PER_COL; // 8 cards per A4 page

  const availableWidth = PAGE_WIDTH - (2 * MARGIN) - ((CARDS_PER_ROW - 1) * GAP);
  const availableHeight = PAGE_HEIGHT - (2 * MARGIN) - ((CARDS_PER_COL - 1) * GAP);
  const cardW = availableWidth / CARDS_PER_ROW;
  const cardH = cardW / CARD.ASPECT_RATIO;

  const maxCardH = availableHeight / CARDS_PER_COL;
  const finalCardH = Math.min(cardH, maxCardH);
  const finalCardW = finalCardH * CARD.ASPECT_RATIO;

  for (let pageStart = 0; pageStart < cardItems.length; pageStart += cardsPerPage) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const pageCards = cardItems.slice(pageStart, pageStart + cardsPerPage);

    if (pageTitle) {
      page.drawText(pageTitle, {
        x: MARGIN,
        y: PAGE_HEIGHT - 18,
        size: 8,
        color: rgb(0.3, 0.35, 0.4),
      });
      page.drawText(`CR80 8-Up Imposition Sheet • Page ${Math.floor(pageStart / cardsPerPage) + 1}`, {
        x: PAGE_WIDTH - MARGIN - 180,
        y: PAGE_HEIGHT - 18,
        size: 8,
        color: rgb(0.5, 0.55, 0.6),
      });
    }

    for (let i = 0; i < pageCards.length; i++) {
      const col = i % CARDS_PER_ROW;
      const row = Math.floor(i / CARDS_PER_ROW);

      const x = MARGIN + col * (finalCardW + GAP);
      const y = PAGE_HEIGHT - MARGIN - (row + 1) * finalCardH - row * GAP;

      try {
        if (pageCards[i]?.png) {
          const pngImage = await embedImageDataUrl(pdfDoc, pageCards[i].png);
          page.drawImage(pngImage, {
            x,
            y,
            width: finalCardW,
            height: finalCardH,
          });

          if (showCropMarks) {
            const markLen = 6;
            const strokeW = 0.5;
            const markColor = rgb(0.7, 0.75, 0.8);

            page.drawLine({ start: { x: x - markLen, y }, end: { x, y }, thickness: strokeW, color: markColor });
            page.drawLine({ start: { x, y: y - markLen }, end: { x, y }, thickness: strokeW, color: markColor });

            page.drawLine({ start: { x: x + finalCardW, y }, end: { x: x + finalCardW + markLen, y }, thickness: strokeW, color: markColor });
            page.drawLine({ start: { x: x + finalCardW, y: y - markLen }, end: { x: x + finalCardW, y }, thickness: strokeW, color: markColor });

            page.drawLine({ start: { x: x - markLen, y: y + finalCardH }, end: { x, y: y + finalCardH }, thickness: strokeW, color: markColor });
            page.drawLine({ start: { x, y: y + finalCardH }, end: { x, y: y + finalCardH + markLen }, thickness: strokeW, color: markColor });

            page.drawLine({ start: { x: x + finalCardW, y: y + finalCardH }, end: { x: x + finalCardW + markLen, y }, thickness: strokeW, color: markColor });
            page.drawLine({ start: { x: x + finalCardW, y: y + finalCardH }, end: { x: x + finalCardW, y: y + finalCardH + markLen }, thickness: strokeW, color: markColor });
          }
        }
      } catch (err) {
        console.error(`[generatePrintSheet] Failed to embed card ${i} on page ${Math.floor(pageStart / cardsPerPage) + 1}:`, err);
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Generates a fully customizable Paper Print Sheet PDF (Canva / Photoshop style).
 * Supports arbitrary paper dimensions, free placement of cards anywhere on the sheet,
 * customizable crop marks, guidelines, and metadata headers.
 */
export async function generateCustomPaperPdf(
  cardsOrPages: PlacedPaperCard[] | PlacedPaperCard[][],
  config: PaperSheetConfig
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const isLandscape = config.orientation === 'landscape';
  const paperWidthMm = isLandscape ? Math.max(config.widthMm, config.heightMm) : Math.min(config.widthMm, config.heightMm);
  const paperHeightMm = isLandscape ? Math.min(config.widthMm, config.heightMm) : Math.max(config.widthMm, config.heightMm);

  const paperWidthPt = paperWidthMm * MM_TO_PT;
  const paperHeightPt = paperHeightMm * MM_TO_PT;

  // Normalize input to array of pages
  const pages: PlacedPaperCard[][] =
    cardsOrPages.length > 0 && Array.isArray(cardsOrPages[0])
      ? (cardsOrPages as PlacedPaperCard[][])
      : [cardsOrPages as PlacedPaperCard[]];

  const totalPages = pages.length;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageCards = pages[pageIdx] || [];
    const page = pdfDoc.addPage([paperWidthPt, paperHeightPt]);
    const pageNum = pageIdx + 1;

    // Optional Sheet Metadata Header
    if (config.showMetadata !== false) {
      page.drawText(`SiliconLabs Production Print Sheet • ${config.paperName} (${Math.round(paperWidthMm)}x${Math.round(paperHeightMm)}mm) • Page ${pageNum} of ${totalPages}`, {
        x: 10 * MM_TO_PT,
        y: paperHeightPt - (8 * MM_TO_PT),
        size: 7,
        color: rgb(0.4, 0.45, 0.5),
      });
      page.drawText(`300 DPI Imposition Engine • Cards on Sheet: ${pageCards.length} • ${new Date().toLocaleDateString()}`, {
        x: paperWidthPt - (78 * MM_TO_PT),
        y: paperHeightPt - (8 * MM_TO_PT),
        size: 7,
        color: rgb(0.5, 0.55, 0.6),
      });
    }

    // Optional Center Fold Guideline
    if (config.showCenterGuide) {
      const centerX = paperWidthPt / 2;
      page.drawLine({
        start: { x: centerX, y: 10 * MM_TO_PT },
        end: { x: centerX, y: paperHeightPt - (10 * MM_TO_PT) },
        thickness: 0.5,
        color: rgb(0.85, 0.88, 0.92),
      });
    }

    // Draw each placed card on this page
    for (const card of pageCards) {
      if (!card.png) continue;

      const xPt = card.xMm * MM_TO_PT;
      const widthPt = card.widthMm * MM_TO_PT;
      const heightPt = card.heightMm * MM_TO_PT;
      // Invert Y coordinate for PDF coordinate space (origin at bottom-left)
      const yPt = paperHeightPt - (card.yMm * MM_TO_PT) - heightPt;

      try {
        const pngImage = await embedImageDataUrl(pdfDoc, card.png);
        page.drawImage(pngImage, {
          x: xPt,
          y: yPt,
          width: widthPt,
          height: heightPt,
          rotate: degrees(card.rotationDeg || 0),
        });

        // Draw Corner Crop Marks
        if (config.showCropMarks !== false) {
          const markLenPt = 3 * MM_TO_PT;
          const markColor = rgb(0.7, 0.75, 0.8);
          const strokeW = 0.5;

          // Top-left
          page.drawLine({ start: { x: xPt - markLenPt, y: yPt + heightPt }, end: { x: xPt, y: yPt + heightPt }, thickness: strokeW, color: markColor });
          page.drawLine({ start: { x: xPt, y: yPt + heightPt }, end: { x: xPt, y: yPt + heightPt + markLenPt }, thickness: strokeW, color: markColor });

          // Top-right
          page.drawLine({ start: { x: xPt + widthPt, y: yPt + heightPt }, end: { x: xPt + widthPt + markLenPt, y: yPt + heightPt }, thickness: strokeW, color: markColor });
          page.drawLine({ start: { x: xPt + widthPt, y: yPt + heightPt }, end: { x: xPt + widthPt, y: yPt + heightPt + markLenPt }, thickness: strokeW, color: markColor });

          // Bottom-left
          page.drawLine({ start: { x: xPt - markLenPt, y: yPt }, end: { x: xPt, y: yPt }, thickness: strokeW, color: markColor });
          page.drawLine({ start: { x: xPt, y: yPt }, end: { x: xPt, y: yPt - markLenPt }, thickness: strokeW, color: markColor });

          // Bottom-right
          page.drawLine({ start: { x: xPt + widthPt, y: yPt }, end: { x: xPt + widthPt + markLenPt, y: yPt }, thickness: strokeW, color: markColor });
          page.drawLine({ start: { x: xPt + widthPt, y: yPt }, end: { x: xPt + widthPt, y: yPt - markLenPt }, thickness: strokeW, color: markColor });
        }
      } catch (err) {
        console.error(`[generateCustomPaperPdf] Failed to embed card "${card.name}" (id=${card.id}) on page ${pageNum}:`, err);
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Triggers download of Uint8Array as PDF.
 */
export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 1500);
}
