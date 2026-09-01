import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, pool } from './index.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

export async function runMigrations() {
  logger.info('Starting PostgreSQL database migrations...');

  try {
    // Ensure migrations table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of applied migrations
    const res = await db.query<{ name: string }>('SELECT name FROM _migrations ORDER BY id ASC');
    const appliedSet = new Set(res.rows.map(r => r.name));

    // Read migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        logger.debug(`Migration ${file} already applied, skipping.`);
        continue;
      }

      logger.info(`Applying migration: ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await db.transaction(async client => {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      });

      logger.info(`Successfully applied migration: ${file}`);
      count++;
    }

    logger.info(`Database migrations completed. (${count} new migration(s) applied)`);
  } catch (err: any) {
    logger.error('Failed to run database migrations', { error: err.message, stack: err.stack });
    throw err;
  }
}

// Allow direct execution via `npm run migrate`
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(() => {
      logger.info('Migration process finished cleanly.');
      pool.end();
    })
    .catch(() => {
      logger.error('Migration failed.');
      process.exit(1);
    });
}
