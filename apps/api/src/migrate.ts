import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { config } from 'dotenv';
import { resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../../../.env') });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is missing in the repository root .env file.');
const url = new URL(connectionString);
const databaseName = url.pathname.slice(1);
if (!databaseName || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(databaseName)) throw new Error('DATABASE_URL contains an invalid database name.');

// Bootstrap the application database through the standard postgres maintenance DB.
const adminUrl = new URL(connectionString);
adminUrl.pathname = '/postgres';
const admin = new pg.Client({ connectionString: adminUrl.toString() });
await admin.connect();
const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
if (!exists.rowCount) {
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  console.log('Created database', databaseName);
}
await admin.end();

const { pool } = await import('./db.js');
const dir = join(here, '../migrations');
await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, run_at timestamptz DEFAULT now())');
for (const name of (await readdir(dir)).filter((x) => x.endsWith('.sql')).sort()) {
  const seen = await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
  if (!seen.rowCount) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(await readFile(join(dir, name), 'utf8'));
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      await client.query('COMMIT');
      console.log('Migrated', name);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
await pool.end();
