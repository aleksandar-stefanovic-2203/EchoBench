import express from 'express';
import { createStore, type Store } from './store/index.js';
import { ApiError, errorHandler } from './middleware/errors.js';
import { authRouter } from './auth/index.js';
import { surveysRouter } from './surveys/index.js';
import { publicRouter, responsesRouter } from './responses/index.js';

export function createApp(store: Store = createStore(), publicAppUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:4200') {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '256kb', strict: false }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter(store));
  app.use('/api/public/surveys', publicRouter(store));
  app.use('/api/surveys', responsesRouter(store));
  app.use('/api/surveys', surveysRouter(store, publicAppUrl));
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Traženi sadržaj nije dostupan.')));
  app.use(errorHandler);
  return app;
}
