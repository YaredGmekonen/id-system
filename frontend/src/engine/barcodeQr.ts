import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

/**
 * Generates a standard scannable QR code PNG Data URL.
 */
export async function generateQrDataUrl(
  text: string,
  width: number = 200,
  darkColor: string = '#14171A',
  lightColor: string = '#FFFFFF'
): Promise<string> {
  const safeText = text || 'ID-000-000';
  try {
    return await QRCode.toDataURL(safeText, {
      width,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    // Fallback simple SVG data URI
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23FFFFFF"/><text x="10" y="50" font-size="12">QR ERROR</text></svg>';
  }
}

/**
 * Generates a standard scannable barcode PNG Data URL.
 * Supports multiple symbologies via bwip-js (code128, code39, ean13, etc.)
 */
export async function generateBarcodeDataUrl(
  text: string,
  width: number = 300,
  height: number = 60,
  includeText: boolean = false,
  barcodeType: string = 'code128'
): Promise<string> {
  const safeText = text || '00000000';
  const safeBcid = (barcodeType || 'code128').toLowerCase().trim();
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      bwipjs.toCanvas(canvas, {
        bcid: safeBcid,
        text: safeText,
        scale: 3,
        height: 10,
        includetext: includeText,
        textxalign: 'center',
        textsize: 10,
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (err) {
      console.error(`Failed to generate barcode (${safeBcid}):`, err);
      // Fallback
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = width;
      fallbackCanvas.height = height;
      const ctx = fallbackCanvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#14171A';
      for (let x = 10; x < width - 10; x += 6) {
        ctx.fillRect(x, 5, 3, height - 10);
      }
      resolve(fallbackCanvas.toDataURL('image/png'));
    }
  });
}
