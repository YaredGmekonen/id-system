import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from server .env and root .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // Database
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/id_platform_db',
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN || '2', 10),
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX || '20', 10),
  DB_TIMEOUT_MS: parseInt(process.env.DB_TIMEOUT_MS || '10000', 10),

  // Storage
  STORAGE_DRIVER: (process.env.STORAGE_DRIVER || 'local') as 'local' | 'supabase' | 's3',
  STORAGE_LOCAL_DIR: path.resolve(__dirname, '../../', process.env.STORAGE_LOCAL_DIR || 'uploads'),
  STORAGE_MAX_FILE_SIZE_MB: parseInt(process.env.STORAGE_MAX_FILE_SIZE_MB || '15', 10),

  // CORS
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map(s => s.trim()),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),

  // Worker & Jobs
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '4', 10),
  GENERATION_CHUNK_SIZE: parseInt(process.env.GENERATION_CHUNK_SIZE || '250', 10),
  JOB_POLL_INTERVAL_MS: parseInt(process.env.JOB_POLL_INTERVAL_MS || '2000', 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
