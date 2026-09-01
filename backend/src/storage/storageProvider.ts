import type { Readable } from 'stream';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  /**
   * Put a buffer or string into object storage at key path
   */
  put(key: string, data: Buffer | string, options?: UploadOptions): Promise<{ path: string; size: number }>;

  /**
   * Get an object as a Buffer
   */
  get(key: string): Promise<Buffer>;

  /**
   * Get an object as a Readable Stream
   */
  getStream(key: string): Promise<Readable>;

  /**
   * Check if an object exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Delete an object
   */
  delete(key: string): Promise<boolean>;

  /**
   * Get public or signed URL for an object
   */
  getUrl(key: string): string;
}
