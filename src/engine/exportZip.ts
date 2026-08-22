import JSZip from 'jszip';

/**
 * Creates a ZIP file from an array of PNG data URLs.
 * Each entry gets its own file in the ZIP.
 */
export async function createCardZip(
  cards: { filename: string; pngDataUrl: string }[]
): Promise<Blob> {
  const zip = new JSZip();

  for (const card of cards) {
    // Convert data URL to binary
    const base64 = card.pngDataUrl.split(',')[1];
    zip.file(card.filename, base64, { base64: true });
  }

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Triggers a download of a Blob as a file with proper filename and extension.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const safeFilename = filename.endsWith('.zip') ? filename : `${filename}.zip`;
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

