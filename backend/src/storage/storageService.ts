import { LocalStorageProvider } from './localStorageProvider.js';
import type { StorageProvider } from './storageProvider.js';
import { env } from '../config/env.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class StorageService {
  private provider: StorageProvider;

  constructor(provider?: StorageProvider) {
    this.provider = provider || new LocalStorageProvider();
  }

  /**
   * Save a person photo (supports Buffer or base64 data URL)
   */
  async savePersonPhoto(
    orgId: string,
    personId: string | number,
    fileData: Buffer | string,
    originalFilename: string = 'photo.jpg'
  ): Promise<{ storagePath: string; url: string; size: number }> {
    let buffer: Buffer;
    let ext = 'jpg';

    if (typeof fileData === 'string') {
      if (fileData.startsWith('data:image/')) {
        const matches = fileData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new ValidationError('Invalid image data URL format');
        }
        ext = matches[1].replace('jpeg', 'jpg');
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(fileData, 'base64');
      }
    } else {
      buffer = fileData;
      const parts = originalFilename.split('.');
      if (parts.length > 1) ext = parts.pop()!.toLowerCase();
    }

    // Validate size limit
    const maxBytes = env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024;
    if (buffer.length > maxBytes) {
      throw new ValidationError(`Photo size exceeds ${env.STORAGE_MAX_FILE_SIZE_MB}MB limit`);
    }

    const timestamp = Date.now();
    const key = `organizations/${orgId}/persons/${personId}/photo_${timestamp}.${ext}`;

    const res = await this.provider.put(key, buffer, {
      contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });

    logger.info(`Saved person photo to storage`, { key, size: res.size });

    return {
      storagePath: key,
      url: this.provider.getUrl(key),
      size: res.size,
    };
  }

  /**
   * Save a template asset (logo, watermark, background)
   */
  async saveTemplateAsset(
    orgId: string,
    templateId: string | number,
    filename: string,
    data: Buffer
  ): Promise<{ storagePath: string; url: string; size: number }> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `organizations/${orgId}/templates/${templateId}/assets/${Date.now()}_${safeName}`;

    const res = await this.provider.put(key, data);
    return {
      storagePath: key,
      url: this.provider.getUrl(key),
      size: res.size,
    };
  }

  /**
   * Save generated job archive (ZIP or PDF)
   */
  async saveJobArtifact(
    orgId: string,
    jobId: string,
    filename: string,
    data: Buffer
  ): Promise<{ storagePath: string; url: string; size: number }> {
    const key = `organizations/${orgId}/jobs/${jobId}/${filename}`;
    const res = await this.provider.put(key, data);
    return {
      storagePath: key,
      url: this.provider.getUrl(key),
      size: res.size,
    };
  }

  /**
   * Retrieve file buffer from storage
   */
  async getFile(key: string): Promise<Buffer> {
    return this.provider.get(key);
  }

  /**
   * Delete file from storage
   */
  async deleteFile(key: string): Promise<boolean> {
    return this.provider.delete(key);
  }

  /**
   * Get public download URL for a storage key
   */
  getFileUrl(key: string): string {
    return this.provider.getUrl(key);
  }
}

export const storageService = new StorageService();
