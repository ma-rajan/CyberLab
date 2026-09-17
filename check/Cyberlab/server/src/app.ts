import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true, methods: ['GET', 'POST'] }));
  app.use(cookieParser());
  app.use(express.json({ limit: '32kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
