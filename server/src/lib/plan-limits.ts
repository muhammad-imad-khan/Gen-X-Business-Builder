import { prisma } from './prisma';

// ─── Plan Definitions ──────────────────────────────────────────
export interface PlanLimits {
  maxProcessedLeads: number;   // max leads that can be processed (COMPLETED + in-flight)
  maxDeployments: number;      // max deployments allowed
  label: string;
}

const PLANS: Record<string, PlanLimits> = {
  free: { maxProcessedLeads: 1, maxDeployments: 1, label: 'Free' },
  pro:  { maxProcessedLeads: Infinity, maxDeployments: Infinity, label: 'Pro' },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLANS[plan] || PLANS.free;
}

// ─── Usage Check ───────────────────────────────────────────────
export interface PlanUsage {
  plan: string;
  label: string;
  maxProcessedLeads: number;
  processedLeads: number;
  canProcess: boolean;
  remaining: number;
  maxDeployments: number;
  deploymentCount: number;
  canDeploy: boolean;
}

/**
 * Returns the user's plan usage — how many leads they've already processed
 * and whether they can process more.
 * "Processed" = any lead not in PENDING or FAILED state (i.e., actively being processed or completed).
 */
export async function getPlanUsage(userId: string): Promise<PlanUsage> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  const plan = user?.plan || 'free';
  const limits = getPlanLimits(plan);

  // Count leads that are completed or currently being processed
  const processedLeads = await prisma.lead.count({
    where: {
      userId,
      status: { in: ['ENRICHING', 'PROCESSING', 'COMPLETED'] },
    },
  });

  // Count existing deployments (non-failed) for this user's leads
  let deploymentCount = 0;
  try {
    const userLeadIds = await prisma.lead.findMany({
      where: { userId },
      select: { id: true },
    });
    if (userLeadIds.length > 0) {
      deploymentCount = await prisma.deployment.count({
        where: {
          leadId: { in: userLeadIds.map(l => l.id) },
          status: { in: ['PENDING', 'DEPLOYING', 'DEPLOYED'] },
        },
      });
    }
  } catch {
    // deployment model may not be available
  }

  const remaining = Math.max(0, limits.maxProcessedLeads - processedLeads);

  return {
    plan,
    label: limits.label,
    maxProcessedLeads: limits.maxProcessedLeads,
    processedLeads,
    canProcess: processedLeads < limits.maxProcessedLeads,
    remaining,
    maxDeployments: limits.maxDeployments,
    deploymentCount,
    canDeploy: deploymentCount < limits.maxDeployments,
  };
}

/**
 * Checks how many more leads a user can process.
 * Returns the number of additional leads allowed (0 = limit reached).
 */
export async function getAllowedProcessCount(userId: string, requested: number): Promise<number> {
  const usage = await getPlanUsage(userId);
  if (usage.maxProcessedLeads === Infinity) return requested;
  return Math.min(requested, usage.remaining);
}
