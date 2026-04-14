import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { config } from '../config';
import { processLead } from '../services/processor';
import { getAllowedProcessCount, getPlanUsage } from '../lib/plan-limits';

const router = Router();

// ─── List Batches ──────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batches = await prisma.batch.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(batches);
  } catch (err) {
    next(err);
  }
});

// ─── Get Batch by ID ───────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batch = await prisma.batch.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId } });
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const leads = await prisma.lead.findMany({
      where: { batchId: batch.id },
      select: { id: true, businessName: true, status: true, solutionType: true },
    });

    res.json({ ...batch, leads });
  } catch (err) {
    next(err);
  }
});

// ─── Start Processing Entire Batch ─────────────────────────────
router.post('/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batch = await prisma.batch.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId } });
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    if (batch.status === 'PROCESSING') {
      res.status(409).json({ error: 'Batch is already processing' });
      return;
    }

    const leads = await prisma.lead.findMany({
      where: { batchId: batch.id, status: 'PENDING' },
    });

    if (leads.length === 0) {
      res.status(400).json({ error: 'No pending leads to process' });
      return;
    }

    // ── Plan limit check ──────────────────────────────────
    const allowed = await getAllowedProcessCount(req.user!.userId, leads.length);
    if (allowed === 0) {
      const usage = await getPlanUsage(req.user!.userId);
      res.status(403).json({
        error: `Free plan limit reached. You can process up to ${usage.maxProcessedLeads} lead. Upgrade to Pro for unlimited processing.`,
        code: 'PLAN_LIMIT_REACHED',
        usage,
      });
      return;
    }

    // Trim leads to allowed count for free plan
    const leadsToProcess = leads.slice(0, allowed);

    await prisma.batch.update({
      where: { id: batch.id },
      data: { status: 'PROCESSING' },
    });

    if (config.isVercel) {
      // Serverless: respond immediately, process first lead in background
      // Client will call POST /api/process/next to process subsequent leads
      res.json({
        batchId: batch.id,
        totalLeads: leadsToProcess.length,
        message: `Processing ${leadsToProcess.length} leads. Poll GET /api/batches/${batch.id}/progress for updates.`,
      });

      // Start processing the first lead in background
      processLead(leadsToProcess[0].id).catch((err) =>
        logger.error({ leadId: leadsToProcess[0].id, err }, 'Background batch processing failed')
      );
    } else {
      // Local: try BullMQ, fall back to inline processor
      try {
        const { enrichmentQueue } = await import('../queues');
        const jobPromises = leadsToProcess.map(async (lead) => {
          const job = await prisma.job.create({
            data: { leadId: lead.id, type: 'ENRICHMENT', status: 'QUEUED' },
          });
          await enrichmentQueue.add(
            'enrich',
            { leadId: lead.id, jobId: job.id, batchId: batch.id },
            { priority: 1 }
          );
          return job.id;
        });
        const jobIds = await Promise.all(jobPromises);
        logger.info({ batchId: batch.id, jobCount: jobIds.length }, 'Batch processing started via BullMQ');
        res.json({ batchId: batch.id, jobsCreated: jobIds.length, message: `Processing ${jobIds.length} leads` });
      } catch {
        // Redis/BullMQ unavailable — use inline processor like Vercel
        res.json({
          batchId: batch.id,
          totalLeads: leadsToProcess.length,
          message: `Processing ${leadsToProcess.length} leads. Poll GET /api/batches/${batch.id}/progress for updates.`,
        });
        processLead(leadsToProcess[0].id).catch((err) =>
          logger.error({ leadId: leadsToProcess[0].id, err }, 'Inline batch processing failed')
        );
      }
    }
  } catch (err) {
    next(err);
  }
});

// ─── Retry Failed Leads in Batch ───────────────────────────────
router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batch = await prisma.batch.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId } });
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    // Find all failed or stuck leads in this batch
    const failedLeads = await prisma.lead.findMany({
      where: { batchId: batch.id, status: { in: ['FAILED', 'ENRICHING', 'PROCESSING'] } },
    });

    if (failedLeads.length === 0) {
      res.status(400).json({ error: 'No failed or stuck leads to retry' });
      return;
    }

    // ── Plan limit check ──────────────────────────────────────
    const allowed = await getAllowedProcessCount(req.user!.userId, failedLeads.length);
    if (allowed === 0) {
      const usage = await getPlanUsage(req.user!.userId);
      res.status(403).json({
        error: `Free plan limit reached. You can process up to ${usage.maxProcessedLeads} lead. Upgrade to Pro for unlimited processing.`,
        code: 'PLAN_LIMIT_REACHED',
        usage,
      });
      return;
    }

    // Trim to allowed count
    const leadsToRetry = failedLeads.slice(0, allowed);
    const failedLeadIds = leadsToRetry.map((l) => l.id);

    // Delete old failed jobs for these leads so they get fresh ones
    await prisma.job.deleteMany({
      where: { leadId: { in: failedLeadIds } },
    });

    // Delete old enrichments/deliverables/outreach for clean retry
    await prisma.outreachMessage.deleteMany({ where: { leadId: { in: failedLeadIds } } });
    await prisma.deliverable.deleteMany({ where: { leadId: { in: failedLeadIds } } });
    await prisma.enrichment.deleteMany({ where: { leadId: { in: failedLeadIds } } });

    // Reset leads back to PENDING
    await prisma.lead.updateMany({
      where: { id: { in: failedLeadIds } },
      data: { status: 'PENDING' },
    });

    // Update batch status back to PROCESSING
    await prisma.batch.update({
      where: { id: batch.id },
      data: { status: 'PROCESSING' },
    });

    logger.info({ batchId: batch.id, retryCount: failedLeadIds.length }, 'Retrying failed leads');

    // Start processing the first lead to retry
    processLead(failedLeadIds[0]).catch((err) =>
      logger.error({ leadId: failedLeadIds[0], err }, 'Retry processing failed')
    );

    res.json({
      batchId: batch.id,
      retriedCount: failedLeadIds.length,
      message: `Retrying ${failedLeadIds.length} of ${failedLeads.length} failed leads`,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get Batch Progress ────────────────────────────────────────
router.get('/:id/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batch = await prisma.batch.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId } });
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' });
      return;
    }

    const leads = await prisma.lead.findMany({
      where: { batchId: batch.id },
      select: { status: true },
    });

    const stats = {
      total: leads.length,
      pending: leads.filter((l) => l.status === 'PENDING').length,
      enriching: leads.filter((l) => l.status === 'ENRICHING').length,
      processing: leads.filter((l) => l.status === 'PROCESSING').length,
      completed: leads.filter((l) => l.status === 'COMPLETED').length,
      failed: leads.filter((l) => l.status === 'FAILED').length,
    };

    res.json({
      batchId: batch.id,
      batchStatus: batch.status,
      ...stats,
      progressPercent: stats.total > 0
        ? Math.round(((stats.completed + stats.failed) / stats.total) * 100)
        : 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
