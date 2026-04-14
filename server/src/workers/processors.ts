import { Worker, Job as BullJob } from 'bullmq';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { config } from '../config';
import { QUEUE_NAMES } from '../queues';
import { enrichLead } from '../services/enrichment';
import { generateAIAgentSpec } from '../services/ai-agent-generator';
import { generateWebsiteProposal } from '../services/website-generator';
import { generateOutreachMessage } from '../services/outreach-generator';
import { broadcastJobProgress, broadcastLeadCompleted, broadcastBatchProgress } from '../lib/websocket';

interface JobData {
  leadId: string;
  jobId: string;
  batchId?: string;
}

// ─── Enrichment Worker ─────────────────────────────────────────
const enrichmentWorker = new Worker(
  QUEUE_NAMES.ENRICHMENT,
  async (bullJob: BullJob<JobData>) => {
    const { leadId, jobId, batchId } = bullJob.data;
    logger.info({ leadId, jobId }, 'Enrichment worker processing');

    await updateJobStatus(jobId, 'RUNNING', 10);
    broadcastJobProgress(jobId, leadId, 10, 'RUNNING');

    try {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
      await prisma.lead.update({ where: { id: leadId }, data: { status: 'ENRICHING' } });

      await updateJobStatus(jobId, 'RUNNING', 30);
      broadcastJobProgress(jobId, leadId, 30, 'RUNNING');

      const enrichment = await enrichLead(lead);

      await updateJobStatus(jobId, 'COMPLETED', 100);
      broadcastJobProgress(jobId, leadId, 100, 'COMPLETED');

      // Enqueue the next step based on solution type
      const updatedLead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
      if (updatedLead.solutionType === 'AI_AGENT') {
        const nextJob = await createJob(leadId, 'AI_AGENT_GENERATION');
        const { aiAgentQueue } = await import('../queues');
        await aiAgentQueue.add('generate', { leadId, jobId: nextJob.id, batchId });
      } else if (updatedLead.solutionType === 'WEBSITE') {
        const nextJob = await createJob(leadId, 'WEBSITE_GENERATION');
        const { websiteQueue } = await import('../queues');
        await websiteQueue.add('generate', { leadId, jobId: nextJob.id, batchId });
      }

      if (batchId) await updateBatchProgress(batchId);
      return { enrichmentId: enrichment.id };
    } catch (err) {
      await updateJobStatus(jobId, 'FAILED', 0, (err as Error).message);
      broadcastJobProgress(jobId, leadId, 0, 'FAILED');
      throw err;
    }
  },
  { connection: redis, concurrency: config.worker.concurrency }
);

// ─── AI Agent Worker ───────────────────────────────────────────
const aiAgentWorker = new Worker(
  QUEUE_NAMES.AI_AGENT,
  async (bullJob: BullJob<JobData>) => {
    const { leadId, jobId, batchId } = bullJob.data;
    logger.info({ leadId, jobId }, 'AI Agent worker processing');

    await updateJobStatus(jobId, 'RUNNING', 10);
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'PROCESSING' } });
    broadcastJobProgress(jobId, leadId, 10, 'RUNNING');

    try {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
      const enrichment = await prisma.enrichment.findUniqueOrThrow({ where: { leadId } });

      await updateJobStatus(jobId, 'RUNNING', 40);
      broadcastJobProgress(jobId, leadId, 40, 'RUNNING');

      const spec = await generateAIAgentSpec(lead, enrichment);

      await updateJobStatus(jobId, 'RUNNING', 80);
      broadcastJobProgress(jobId, leadId, 80, 'RUNNING');

      // Enqueue outreach generation
      const outreachJob = await createJob(leadId, 'OUTREACH_GENERATION');
      const { outreachQueue } = await import('../queues');
      await outreachQueue.add('generate', {
        leadId,
        jobId: outreachJob.id,
        batchId,
      });

      await updateJobStatus(jobId, 'COMPLETED', 100);
      broadcastJobProgress(jobId, leadId, 100, 'COMPLETED');

      if (batchId) await updateBatchProgress(batchId);
      return { spec };
    } catch (err) {
      await updateJobStatus(jobId, 'FAILED', 0, (err as Error).message);
      broadcastJobProgress(jobId, leadId, 0, 'FAILED');
      throw err;
    }
  },
  { connection: redis, concurrency: config.worker.concurrency }
);

// ─── Website Worker ────────────────────────────────────────────
const websiteWorker = new Worker(
  QUEUE_NAMES.WEBSITE,
  async (bullJob: BullJob<JobData>) => {
    const { leadId, jobId, batchId } = bullJob.data;
    logger.info({ leadId, jobId }, 'Website worker processing');

    await updateJobStatus(jobId, 'RUNNING', 10);
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'PROCESSING' } });
    broadcastJobProgress(jobId, leadId, 10, 'RUNNING');

    try {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
      const enrichment = await prisma.enrichment.findUniqueOrThrow({ where: { leadId } });

      await updateJobStatus(jobId, 'RUNNING', 40);
      broadcastJobProgress(jobId, leadId, 40, 'RUNNING');

      const proposal = await generateWebsiteProposal(lead, enrichment);

      await updateJobStatus(jobId, 'RUNNING', 80);
      broadcastJobProgress(jobId, leadId, 80, 'RUNNING');

      // Enqueue outreach generation
      const outreachJob = await createJob(leadId, 'OUTREACH_GENERATION');
      const { outreachQueue } = await import('../queues');
      await outreachQueue.add('generate', {
        leadId,
        jobId: outreachJob.id,
        batchId,
      });

      await updateJobStatus(jobId, 'COMPLETED', 100);
      broadcastJobProgress(jobId, leadId, 100, 'COMPLETED');

      if (batchId) await updateBatchProgress(batchId);
      return { proposal };
    } catch (err) {
      await updateJobStatus(jobId, 'FAILED', 0, (err as Error).message);
      broadcastJobProgress(jobId, leadId, 0, 'FAILED');
      throw err;
    }
  },
  { connection: redis, concurrency: config.worker.concurrency }
);

// ─── Outreach Worker ───────────────────────────────────────────
const outreachWorker = new Worker(
  QUEUE_NAMES.OUTREACH,
  async (bullJob: BullJob<JobData>) => {
    const { leadId, jobId, batchId } = bullJob.data;
    logger.info({ leadId, jobId }, 'Outreach worker processing');

    await updateJobStatus(jobId, 'RUNNING', 20);
    broadcastJobProgress(jobId, leadId, 20, 'RUNNING');

    try {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
      const enrichment = await prisma.enrichment.findUniqueOrThrow({ where: { leadId } });

      // Get the deliverable content for context
      const deliverable = await prisma.deliverable.findFirst({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
      });

      await updateJobStatus(jobId, 'RUNNING', 50);
      broadcastJobProgress(jobId, leadId, 50, 'RUNNING');

      const result = await generateOutreachMessage(
        lead,
        enrichment,
        lead.solutionType!,
        deliverable?.content as Record<string, unknown> | undefined
      );

      // Mark lead as completed
      await prisma.lead.update({ where: { id: leadId }, data: { status: 'COMPLETED' } });

      await updateJobStatus(jobId, 'COMPLETED', 100);
      broadcastJobProgress(jobId, leadId, 100, 'COMPLETED');
      broadcastLeadCompleted(leadId);

      if (batchId) await updateBatchProgress(batchId);
      return result;
    } catch (err) {
      await updateJobStatus(jobId, 'FAILED', 0, (err as Error).message);
      await prisma.lead.update({ where: { id: leadId }, data: { status: 'FAILED' } });
      broadcastJobProgress(jobId, leadId, 0, 'FAILED');
      throw err;
    }
  },
  { connection: redis, concurrency: config.worker.concurrency }
);

// ─── Helper functions ──────────────────────────────────────────
async function updateJobStatus(jobId: string, status: string, progress: number, errorMsg?: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: status as any,
      progress,
      errorMsg: errorMsg || null,
      ...(status === 'RUNNING' ? { startedAt: new Date() } : {}),
      ...(status === 'COMPLETED' || status === 'FAILED' ? { completedAt: new Date() } : {}),
    },
  });
}

async function createJob(leadId: string, type: string) {
  return prisma.job.create({
    data: {
      leadId,
      type: type as any,
      status: 'QUEUED',
      progress: 0,
    },
  });
}

async function updateBatchProgress(batchId: string) {
  const leads = await prisma.lead.findMany({ where: { batchId } });
  const stats = {
    totalLeads: leads.length,
    completed: leads.filter((l) => l.status === 'COMPLETED').length,
    failed: leads.filter((l) => l.status === 'FAILED').length,
    inProgress: leads.filter((l) => ['ENRICHING', 'PROCESSING'].includes(l.status)).length,
  };

  const batchStatus =
    stats.completed + stats.failed === stats.totalLeads
      ? stats.failed === stats.totalLeads
        ? 'FAILED'
        : 'COMPLETED'
      : 'PROCESSING';

  await prisma.batch.update({
    where: { id: batchId },
    data: { ...stats, status: batchStatus as any },
  });

  broadcastBatchProgress(batchId, stats);
}

// Graceful shutdown
function shutdown() {
  logger.info('Shutting down workers...');
  Promise.all([
    enrichmentWorker.close(),
    aiAgentWorker.close(),
    websiteWorker.close(),
    outreachWorker.close(),
  ]).then(() => {
    logger.info('All workers stopped');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Error handlers
for (const worker of [enrichmentWorker, aiAgentWorker, websiteWorker, outreachWorker]) {
  worker.on('error', (err) => {
    logger.error({ err, worker: worker.name }, 'Worker error');
  });
}

logger.info(
  { concurrency: config.worker.concurrency },
  'All workers started: enrichment, ai-agent, website, outreach'
);

export { enrichmentWorker, aiAgentWorker, websiteWorker, outreachWorker };
