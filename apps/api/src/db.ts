import pg from 'pg';
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Workspace scripts execute from apps/api, so load the repository-level file explicitly.
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
config({ path: resolve(repositoryRoot, '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Copy .env.example to .env in the repository root and set the PostgreSQL password.');
}
let databaseUrl: URL;
try {
  databaseUrl = new URL(connectionString);
} catch {
  throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.');
}
if (!databaseUrl.password) {
  throw new Error('DATABASE_URL must include a PostgreSQL password.');
}

export const pool = new pg.Pool({ connectionString });
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>) {
  const c = await pool.connect();
  try { await c.query('BEGIN'); const out = await fn(c); await c.query('COMMIT'); return out; }
  catch (e) { await c.query('ROLLBACK'); throw e; }
  finally { c.release(); }
}
