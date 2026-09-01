/**
 * SiliconLabs Universal Design File Router & Validator
 * 
 * Inspects file type/extension on upload and routes to the best specialized parser:
 * - PSD: Native Photoshop layer parser (ag-psd) — zero AI guesswork
 * - AI: Illustrator PDF-compatible stream parser (pdf-lib)
 * - PNG/JPG/WebP: Hybrid AI Vision layout deconstructor
 * - SVG: Vector format deconstructor
 * - Unsupported: Immediate honest error message — never swallowed as an "Event"
 */

import type { DeconstructionResult } from './designDeconstructor';
import { deconstructDesignImage } from './designDeconstructor';
import { deconstructPsdFile } from './psdDeconstructor';
import { deconstructAiFile } from './aiDeconstructor';
import { CARD } from '../design-tokens';

export const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.psd', '.ai', '.svg', '.bmp'];

export type FileCategory = 'psd' | 'ai' | 'svg' | 'raster' | 'unsupported';

/**
 * Determines file category from filename and mime type.
 */
export function getFileCategory(file: File | string): FileCategory {
  const filename = typeof file === 'string' ? file : file.name;
  const ext = (filename.split('.').pop() || '').toLowerCase();

  if (ext === 'psd') return 'psd';
  if (ext === 'ai') return 'ai';
  if (ext === 'svg') return 'svg';
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext)) return 'raster';

  // If MIME type indicates image
  if (typeof file !== 'string' && file.type?.startsWith('image/')) {
    return 'raster';
  }

  return 'unsupported';
}

/**
 * Validates a file before processing. Throws a clear user-facing error if unsupported.
 */
export function validateDesignFile(file: File): void {
  const category = getFileCategory(file);
  if (category === 'unsupported') {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
    throw new Error(
      `This file type (${ext || file.type || 'unknown'}) isn't supported yet. Try PNG, JPG, SVG, or PSD.`
    );
  }
}

/**
 * Universal file deconstruction entry point.
 * Routes to the optimal engine based on file type.
 */
export async function deconstructDesignFile(
  file: File,
  targetWidth: number = CARD.WIDTH_PX,
  targetHeight: number = CARD.HEIGHT_PX,
  side: 'front' | 'back' = 'front'
): Promise<DeconstructionResult> {
  validateDesignFile(file);

  const category = getFileCategory(file);

  switch (category) {
    case 'psd':
      return await deconstructPsdFile(file, targetWidth, targetHeight, side);

    case 'ai':
      return await deconstructAiFile(file, targetWidth, targetHeight, side);

    case 'svg':
    case 'raster':
    default:
      return await deconstructDesignImage(file, targetWidth, targetHeight, side);
  }
}
