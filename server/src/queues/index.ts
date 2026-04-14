import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../lib/redis';
import { logger } from '../lib/logger';

// Queue names
export const QUEUE_NAMES = {
  ENRICHMENT: 'lead-enrichment',
  AI_AGENT: 'ai-agent-generation',
  WEBSITE: 'website-generation',
  OUTREACH: 'outreach-generation',
} as const;

// Create queues
export const enrichmentQueue = new Queue(QUEUE_NAMES.ENRICHMENT, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

export const aiAgentQueue = new Queue(QUEUE_NAMES.AI_AGENT, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

export const websiteQueue = new Queue(QUEUE_NAMES.WEBSITE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

export const outreachQueue = new Queue(QUEUE_NAMES.OUTREACH, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 500 },
  },
});

// Queue event listeners for logging
const queueNames = Object.values(QUEUE_NAMES);
for (const name of queueNames) {
  const events = new QueueEvents(name, { connection: redis });
  events.on('completed', ({ jobId }) => {
    logger.debug({ jobId, queue: name }, 'Job completed');
  });
  events.on('failed', ({ jobId, failedReason }) => {
    logger.error({ jobId, queue: name, reason: failedReason }, 'Job failed');
  });
}

logger.info('Job queues initialized');
