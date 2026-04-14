import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ─── Overview Stats ────────────────────────────────────────────
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const [totalLeads, pending, enriching, processing, completed, failed, totalBatches] =
      await Promise.all([
        prisma.lead.count({ where: { userId } }),
        prisma.lead.count({ where: { userId, status: 'PENDING' } }),
        prisma.lead.count({ where: { userId, status: 'ENRICHING' } }),
        prisma.lead.count({ where: { userId, status: 'PROCESSING' } }),
        prisma.lead.count({ where: { userId, status: 'COMPLETED' } }),
        prisma.lead.count({ where: { userId, status: 'FAILED' } }),
        prisma.batch.count({ where: { userId } }),
      ]);

    const activeJobs = await prisma.job.count({ where: { status: 'RUNNING', lead: { userId } } });
    const queuedJobs = await prisma.job.count({ where: { status: 'QUEUED', lead: { userId } } });

    res.json({
      leads: {
        total: totalLeads,
        pending,
        enriching,
        processing,
        inProgress: enriching + processing,
        completed,
        failed,
      },
      jobs: {
        active: activeJobs,
        queued: queuedJobs,
      },
      batches: totalBatches,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
