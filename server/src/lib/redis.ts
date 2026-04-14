import Redis from 'ioredis';
import { logger } from './logger';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.KV_URL || process.env.REDIS_URL || 'redis://localhost:6379';

    _redis = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 500, 3000);
      },
      // Vercel KV requires TLS
      ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
    });

    _redis.on('connect', () => logger.info('Redis/KV connected'));
    _redis.on('error', (err) => logger.error({ err }, 'Redis/KV error'));
  }
  return _redis;
}

// Export a getter that creates on demand — consumers should use getRedis()
// Backwards compat: queues/workers import `redis` directly
export const redis = (() => {
  try {
    return getRedis();
  } catch {
    logger.warn('Redis client creation failed');
    return null as unknown as Redis;
  }
})();
