import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ─── Get Jobs for a Lead ───────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { leadId, status } = req.query;
    const userId = req.user!.userId;

    const where: any = { lead: { userId } };
    if (leadId) where.leadId = leadId;
    if (status) where.status = status;

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

// ─── Get Job by ID ─────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id as string, lead: { userId: req.user!.userId } },
      include: {
        lead: { select: { id: true, businessName: true, status: true } },
        deliverables: true,
      },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
});

export default router;
