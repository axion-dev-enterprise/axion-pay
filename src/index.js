import { app } from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { ensureAdminUser } from './services/adminUserService.js';

ensureAdminUser();

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.env },
      'Payment Gateway API rodando.'
    );
  });
}

export default app;

