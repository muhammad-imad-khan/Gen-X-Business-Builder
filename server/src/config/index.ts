import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  database: {
    url: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL!,
  },

  redis: {
    url: process.env.KV_URL || process.env.REDIS_URL || 'redis://localhost:6379',
    token: process.env.KV_REST_API_TOKEN || '',
    restUrl: process.env.KV_REST_API_URL || '',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  },

  azure: {
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    resource: process.env.AZURE_OPENAI_RESOURCE || '',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
  },

  appUrl: process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.CLIENT_URL || 'http://localhost:5173')),

  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'genx-change-this-secret',
    expiresIn: '7d',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Gen X <noreply@genx.app>',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  },

  isVercel: !!process.env.VERCEL,

  paddle: {
    apiKey: process.env.PADDLE_ENV === 'production'
      ? process.env.LIVE_PADDLE_API_KEY || ''
      : process.env.TEST_PADDLE_API_KEY || '',
    webhookSecret: process.env.PADDLE_ENV === 'production'
      ? process.env.LIVE_WEBHOOK_SECRET || ''
      : process.env.TEST_PADDLE_WEBHOOK_SECRET || '',
    clientToken: process.env.PADDLE_ENV === 'production'
      ? process.env.LIVE_PADDLE_CLIENT_TOKEN || ''
      : process.env.TEST_PADDLE_CLIENT_TOKEN || '',
    proPriceId: process.env.PADDLE_ENV === 'production'
      ? process.env.PRICE_GXBB_PRO_ID || ''
      : process.env.TEST_GXBB_PRO_ID || '',
    environment: (process.env.PADDLE_ENV || 'sandbox') as 'sandbox' | 'production',
  },
} as const;
