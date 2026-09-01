import fs from 'fs';
import path from 'path';
import type { Readable } from 'stream';
import type { StorageProvider, UploadOptions } from './storageProvider.js';
import { env } from '../config/env.js';
import { StorageError, NotFoundError } from '../utils/errors.js';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir: string = env.STORAGE_LOCAL_DIR) {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(key: string): string {
    // Sanitize path to prevent directory traversal
    const safeKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.baseDir, safeKey);
  }

  async put(key: string, data: Buffer | string, _options?: UploadOptions): Promise<{ path: string; size: number }> {
    const fullPath = this.resolvePath(key);
    const dir = path.dirname(fullPath);

    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      fs.writeFileSync(fullPath, buffer);

      return {
        path: key,
        size: buffer.length,
      };
    } catch (err: any) {
      throw new StorageError(`Failed to save file locally: ${err.message}`, { key });
    }
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = this.resolvePath(key);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Storage file', key);
    }
    return fs.readFileSync(fullPath);
  }

  async getStream(key: string): Promise<Readable> {
    const fullPath = this.resolvePath(key);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError('Storage file', key);
    }
    return fs.createReadStream(fullPath);
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.resolvePath(key);
    return fs.existsSync(fullPath);
  }

  async delete(key: string): Promise<boolean> {
    const fullPath = this.resolvePath(key);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  getUrl(key: string): string {
    return `/api/v1/storage/files/${encodeURIComponent(key)}`;
  }
}
