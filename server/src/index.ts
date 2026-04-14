import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { logger } from './lib/logger';
import { ZodError } from 'zod';

// Prevent unhandled rejections from crashing the process (e.g., Redis connection errors)
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection');
});

// Import routes
import authRouter from './routes/auth';
import leadsRouter from './routes/leads';
import batchesRouter from './routes/batches';
import jobsRouter from './routes/jobs';
import statsRouter from './routes/stats';
import processRouter from './routes/process';
import settingsRouter from './routes/settings';
import scrapeRouter from './routes/scrape';
import categoriesRouter from './routes/categories';
import { requireAuth } from './lib/auth';

const app = express();

// ─── Middleware ─────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.isVercel ? true : config.cors.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

if (!config.isVercel) {
  app.use(
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' },
    })
  );
}

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'Request');
  next();
});

// ─── Routes ────────────────────────────────────────────────────
// Auth routes (public)
app.use('/api/auth', authRouter);

// All other routes require authentication
app.use('/api/leads', requireAuth, leadsRouter);
app.use('/api/batches', requireAuth, batchesRouter);
app.use('/api/jobs', requireAuth, jobsRouter);
app.use('/api/stats', requireAuth, statsRouter);
app.use('/api/process', requireAuth, processRouter);
app.use('/api/settings', requireAuth, settingsRouter);
app.use('/api/scrape', requireAuth, scrapeRouter);
app.use('/api/categories', requireAuth, categoriesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), vercel: config.isVercel });
});

// ─── Error Handler ─────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server (local dev only, Vercel uses the export) ─────
if (!config.isVercel) {
  const server = createServer(app);

  // Only import WebSocket and workers for local dev
  import('./lib/websocket').then(({ initWebSocket }) => {
    initWebSocket(server);
  });

  // Workers require Redis — load them in a try/catch so the server starts even without Redis
  import('./workers/processors')
    .then(() => logger.info('BullMQ workers loaded'))
    .catch((err) => {
      logger.warn({ err: err.message }, 'Workers not loaded (Redis may not be available). The server will still handle API requests. Processing will use inline processor.');
    });

  // Start listening regardless of worker status
  server.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'Server started');
  });
}

// Export for Vercel serverless
export default app;
