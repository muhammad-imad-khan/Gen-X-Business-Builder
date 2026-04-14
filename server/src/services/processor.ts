import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { enrichLead } from './enrichment';
import { generateAIAgentSpec } from './ai-agent-generator';
import { generateWebsiteProposal } from './website-generator';
import { generateOutreachMessage } from './outreach-generator';
import { generateProjectFiles } from './code-generator';
import { deployToVercel } from './deployment';
import { getPlanUsage } from '../lib/plan-limits';

/**
 * Serverless-compatible lead processor.
 * Processes a single lead through the entire pipeline:
 * Enrichment → AI Agent/Website Generation → Outreach Email
 *
 * Designed to run within a single serverless invocation.
 * On Vercel free tier, max 10s per call.
 * On Vercel Pro, max 60s per call.
 */
export async function processLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { success: false, error: 'Lead not found' };
  if (!lead.solutionType) return { success: false, error: 'No solution type selected' };

  try {
    // ── Step 1: Enrichment ──────────────────────────────────
    const enrichJob = await prisma.job.create({
      data: { leadId, type: 'ENRICHMENT', status: 'RUNNING', progress: 10, startedAt: new Date() },
    });

    await prisma.lead.update({ where: { id: leadId }, data: { status: 'ENRICHING' } });

    let enrichment;
    try {
      enrichment = await enrichLead(lead);
      await prisma.job.update({
        where: { id: enrichJob.id },
        data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
      });
    } catch (err) {
      await prisma.job.update({
        where: { id: enrichJob.id },
        data: { status: 'FAILED', progress: 0, errorMsg: (err as Error).message, completedAt: new Date() },
      });
      throw err;
    }

    // ── Step 2: Solution Generation ─────────────────────────
    const genType = lead.solutionType === 'AI_AGENT' ? 'AI_AGENT_GENERATION' : 'WEBSITE_GENERATION';
    const genJob = await prisma.job.create({
      data: { leadId, type: genType as any, status: 'RUNNING', progress: 10, startedAt: new Date() },
    });

    await prisma.lead.update({ where: { id: leadId }, data: { status: 'PROCESSING' } });

    let deliverableContent: Record<string, unknown> | undefined;
    try {
      if (lead.solutionType === 'AI_AGENT') {
        deliverableContent = await generateAIAgentSpec(lead, enrichment);
      } else {
        deliverableContent = await generateWebsiteProposal(lead, enrichment);
      }
      await prisma.job.update({
        where: { id: genJob.id },
        data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
      });
    } catch (err) {
      await prisma.job.update({
        where: { id: genJob.id },
        data: { status: 'FAILED', progress: 0, errorMsg: (err as Error).message, completedAt: new Date() },
      });
      throw err;
    }

    // ── Step 3: Outreach Email ──────────────────────────────
    const outreachJob = await prisma.job.create({
      data: { leadId, type: 'OUTREACH_GENERATION', status: 'RUNNING', progress: 10, startedAt: new Date() },
    });

    try {
      await generateOutreachMessage(lead, enrichment, lead.solutionType, deliverableContent);
      await prisma.job.update({
        where: { id: outreachJob.id },
        data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
      });
    } catch (err) {
      await prisma.job.update({
        where: { id: outreachJob.id },
        data: { status: 'FAILED', progress: 0, errorMsg: (err as Error).message, completedAt: new Date() },
      });
      throw err;
    }

    // ── Step 4: Auto-Deploy (optional) ──────────────────────
    let settings: any = null;
    try {
      settings = await (prisma as any).settings?.findUnique({ where: { userId: lead.userId } });
    } catch {
      // settings not available
    }

    // Check plan deployment limit before deploying
    const planUsage = await getPlanUsage(lead.userId);

    if (
      planUsage.canDeploy &&
      settings?.autoDeployToVercel &&
      settings.vercelConnected &&
      settings.vercelToken &&
      settings.githubConnected &&
      settings.githubToken
    ) {
      const deployJob = await prisma.job.create({
        data: { leadId, type: 'DEPLOYMENT', status: 'RUNNING', progress: 10, startedAt: new Date() },
      });

      try {
        // Load enrichment and deliverable from DB for the code generator
        const enrichmentRecord = await prisma.enrichment.findUnique({ where: { leadId } });
        const deliverableRecord = await prisma.deliverable.findFirst({
          where: { leadId },
          orderBy: { createdAt: 'desc' },
        });

        if (enrichmentRecord && deliverableRecord) {
          const files = generateProjectFiles(lead, enrichmentRecord, deliverableRecord);
          const projectName = `${lead.businessName} ${lead.solutionType === 'AI_AGENT' ? 'Agent' : 'Website'}`;

          await deployToVercel({
            leadId,
            userId: lead.userId,
            projectName,
            files,
            framework: 'nextjs',
          });
        }

        await prisma.job.update({
          where: { id: deployJob.id },
          data: { status: 'COMPLETED', progress: 100, completedAt: new Date() },
        });
        logger.info({ leadId }, 'Auto-deploy completed');
      } catch (err) {
        // Deployment failure should NOT fail the whole lead
        await prisma.job.update({
          where: { id: deployJob.id },
          data: { status: 'FAILED', progress: 0, errorMsg: (err as Error).message, completedAt: new Date() },
        });
        logger.warn({ leadId, err }, 'Auto-deploy failed (non-blocking)');
      }
    }

    // ── Mark lead as completed ──────────────────────────────
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'COMPLETED' } });
    if (lead.batchId) await updateBatchProgress(lead.batchId);

    logger.info({ leadId, business: lead.businessName }, 'Lead fully processed');
    return { success: true };
  } catch (err) {
    await prisma.lead.update({ where: { id: leadId }, data: { status: 'FAILED' } });
    if (lead.batchId) await updateBatchProgress(lead.batchId);
    logger.error({ leadId, err }, 'Lead processing failed');
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Process the next pending lead from a batch (or globally).
 * Designed to be called repeatedly by client polling or Vercel cron.
 */
export async function processNextLead(batchId?: string): Promise<{
  processed: boolean;
  leadId?: string;
  remaining: number;
}> {
  const where: any = { status: 'PENDING', solutionType: { not: null } };
  if (batchId) where.batchId = batchId;

  const lead = await prisma.lead.findFirst({
    where,
    orderBy: { createdAt: 'asc' },
  });

  if (!lead) {
    const remaining = await prisma.lead.count({ where });
    return { processed: false, remaining };
  }

  await processLead(lead.id);
  const remaining = await prisma.lead.count({ where });
  return { processed: true, leadId: lead.id, remaining };
}

async function updateBatchProgress(batchId: string) {
  const leads = await prisma.lead.findMany({
    where: { batchId },
    select: { status: true },
  });

  const stats = {
    totalLeads: leads.length,
    completed: leads.filter((l) => l.status === 'COMPLETED').length,
    failed: leads.filter((l) => l.status === 'FAILED').length,
    inProgress: leads.filter((l) => ['ENRICHING', 'PROCESSING'].includes(l.status)).length,
  };

  const batchStatus =
    stats.completed + stats.failed === stats.totalLeads
      ? stats.failed === stats.totalLeads ? 'FAILED' : 'COMPLETED'
      : stats.inProgress > 0 || stats.completed > 0 ? 'PROCESSING' : 'PENDING';

  await prisma.batch.update({
    where: { id: batchId },
    data: { ...stats, status: batchStatus as any },
  });
}
