import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { BatchImportSchema, PaginationSchema, StartProcessingSchema } from '../lib/validation';
import { logger } from '../lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { processLead } from '../services/processor';
import { getPlanUsage } from '../lib/plan-limits';

const router = Router();

// ─── Import Leads (batch) ──────────────────────────────────────
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = BatchImportSchema.parse(req.body);
    const userId = req.user!.userId;
    const batchId = uuidv4();

    // Create batch record
    const batch = await prisma.batch.create({
      data: {
        id: batchId,
        userId,
        name: input.batchName || `Batch ${new Date().toISOString()}`,
        solutionType: input.solutionType,
        totalLeads: input.leads.length,
        status: 'PENDING',
      },
    });

    // Bulk create leads
    const leads = await prisma.$transaction(
      input.leads.map((lead) =>
        prisma.lead.create({
          data: {
            batchId,
            userId,
            businessName: lead.businessName,
            category: lead.category || null,
            address: lead.address || null,
            phone: lead.phone || null,
            website: lead.website || null,
            email: lead.email || null,
            rating: lead.rating || null,
            socials: lead.socials || null,
            hours: lead.hours || null,
            metadata: (lead.metadata || {}) as any,
            solutionType: input.solutionType,
            status: 'PENDING',
          },
        })
      )
    );

    logger.info({ batchId, count: leads.length }, 'Leads imported');

    res.status(201).json({
      batchId,
      leadsCreated: leads.length,
      solutionType: input.solutionType,
      message: `${leads.length} leads imported. Use POST /api/batches/${batchId}/start to begin processing.`,
    });
  } catch (err) {
    next(err);
  }
});

// ─── List Leads ────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = PaginationSchema.parse(req.query);
    const { page, limit, status, batchId, search, category } = params;
    const userId = req.user!.userId;

    const where: any = { userId };
    if (status) where.status = status;
    if (batchId) where.batchId = batchId;
    if (search) {
      where.businessName = { contains: search, mode: 'insensitive' };
    }
    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          enrichment: true,
          deliverables: { select: { id: true, type: true, title: true, summary: true } },
          outreach: { select: { id: true, subject: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get Lead by ID (with full details) ────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
      include: {
        enrichment: true,
        jobs: { orderBy: { createdAt: 'desc' } },
        deliverables: true,
        outreach: true,
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json(lead);
  } catch (err) {
    next(err);
  }
});

// ─── Start Processing a Single Lead ────────────────────────────
router.post('/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { solutionType } = StartProcessingSchema.parse(req.body);

    const lead = await prisma.lead.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId } });
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // ── Plan limit check ──────────────────────────────────
    const usage = await getPlanUsage(req.user!.userId);
    if (!usage.canProcess) {
      res.status(403).json({
        error: `Free plan limit reached. You can process up to ${usage.maxProcessedLeads} lead. Upgrade to Pro for unlimited processing.`,
        code: 'PLAN_LIMIT_REACHED',
        usage,
      });
      return;
    }

    // Update lead with solution type
    await prisma.lead.update({
      where: { id: lead.id },
      data: { solutionType, status: 'PENDING' },
    });

    if (config.isVercel) {
      // Serverless: process inline (fire-and-forget for the response, but wait in background)
      // We return immediately, then the client polls for progress
      res.json({ message: 'Processing started' });
      processLead(lead.id).catch((err) =>
        logger.error({ leadId: lead.id, err }, 'Background processing failed')
      );
    } else {
      // Local: try BullMQ queue, fall back to inline processor if Redis is unavailable
      try {
        const { enrichmentQueue } = await import('../queues');
        const job = await prisma.job.create({
          data: { leadId: lead.id, type: 'ENRICHMENT', status: 'QUEUED' },
        });
        await enrichmentQueue.add('enrich', {
          leadId: lead.id,
          jobId: job.id,
          batchId: lead.batchId || undefined,
        });
        logger.info({ leadId: lead.id, jobId: job.id, solutionType }, 'Lead processing started via BullMQ');
        res.json({ jobId: job.id, message: 'Processing started' });
      } catch {
        // Redis/BullMQ unavailable — use inline processor
        res.json({ message: 'Processing started' });
        processLead(lead.id).catch((err) =>
          logger.error({ leadId: lead.id, err }, 'Inline processing failed')
        );
      }
    }
  } catch (err) {
    next(err);
  }
});

// ─── Get Lead Preview (deliverables + outreach) ────────────────
router.get('/:id/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
      include: {
        enrichment: true,
        deliverables: true,
        outreach: true,
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Fetch deployment separately (no FK relation on Lead)
    let deployment: any = null;
    try {
      deployment = await (prisma as any).deployment?.findFirst({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // deployment model may not be available
    }

    res.json({
      lead: {
        id: lead.id,
        businessName: lead.businessName,
        category: lead.category,
        address: lead.address,
        website: lead.website,
        phone: lead.phone,
        status: lead.status,
        solutionType: lead.solutionType,
      },
      enrichment: lead.enrichment,
      deliverables: lead.deliverables,
      outreach: lead.outreach,
      deployment: deployment
        ? {
            id: deployment.id,
            status: deployment.status,
            projectName: deployment.projectName,
            projectUrl: deployment.projectUrl,
            deployUrl: deployment.deployUrl,
            repoUrl: deployment.repoUrl,
            errorMsg: deployment.errorMsg,
            createdAt: deployment.createdAt,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
