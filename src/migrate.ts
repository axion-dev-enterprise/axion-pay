import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
async function findMigrationsDirectory(): Promise<string> {
  const candidates = [
    path.resolve(currentDirectory, '../sql'),
    path.resolve(currentDirectory, '../../sql'),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Tentar o próximo layout (tsx em src ou build em dist/src).
    }
  }
  throw new Error('Diretório sql não encontrado.');
}

export async function runMigrations(): Promise<void> {
  const migrationsDirectory = await findMigrationsDirectory();
  const client = await db.connect();
  try {
    await client.query('SELECT pg_advisory_lock(925021)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDirectory))
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();

    for (const name of files) {
      const alreadyApplied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [name],
      );
      if (alreadyApplied.rowCount) continue;

      const sql = await readFile(path.join(migrationsDirectory, name), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        console.info(`Migration aplicada: ${name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(925021)').catch(() => undefined);
    client.release();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await runMigrations();
  } finally {
    await db.end();
  }
}
