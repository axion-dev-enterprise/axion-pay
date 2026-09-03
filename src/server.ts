import { buildApp } from './app.js';
import { config } from './config.js';
import { db } from './db.js';
import { runMigrations } from './migrate.js';
import { redis } from './redis.js';

if (!config.WOOVI_APP_ID) {
  console.warn('[WARN] WOOVI_APP_ID vazio. As cobranças PIX não estarão disponíveis.');
}

await runMigrations();
const app = await buildApp();

async function shutdown(signal: string) {
  app.log.info({ signal }, 'Encerrando AXION Pay');
  await app.close();
  await Promise.allSettled([db.end(), redis.quit()]);
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

await app.listen({ port: config.PORT, host: '0.0.0.0' });
