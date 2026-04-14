import { beforeAll, afterAll, vi } from 'vitest';
import { createServer, Server } from 'http';
import { randomUUID } from 'crypto';

type LeadStatus = 'PENDING' | 'ENRICHING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type SolutionType = 'AI_AGENT' | 'WEBSITE' | null;
type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
type JobType = 'ENRICHMENT' | 'AI_AGENT_GENERATION' | 'WEBSITE_GENERATION' | 'OUTREACH_GENERATION';
type DeliverableType = 'AI_AGENT_SPEC' | 'WEBSITE_PROPOSAL';
type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface LeadRecord {
  id: string;
  batchId: string | null;
  userId: string;
  businessName: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  socials: string | null;
  hours: string | null;
  metadata: Record<string, unknown>;
  solutionType: SolutionType;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface BatchRecord {
  id: string;
  name: string | null;
  userId: string;
  solutionType: Exclude<SolutionType, null>;
  totalLeads: number;
  completed: number;
  failed: number;
  inProgress: number;
  status: BatchStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface JobRecord {
  id: string;
  leadId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  workerName: string | null;
  errorMsg: string | null;
  attempts: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EnrichmentRecord {
  id: string;
  leadId: string;
  businessSummary: string | null;
  services: string[];
  targetAudience: string | null;
  painPoints: string[];
  opportunities: string[];
  digitalPresenceScore: number;
  maturityLevel: string | null;
  decisionMakerRole: string | null;
  socialProfiles: Record<string, unknown>;
  competitorInsights: string | null;
  createdAt: Date;
}

interface DeliverableRecord {
  id: string;
  leadId: string;
  jobId: string;
  type: DeliverableType;
  title: string | null;
  content: Record<string, unknown>;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OutreachRecord {
  id: string;
  leadId: string;
  subject: string;
  body: string;
  toName: string | null;
  toEmail: string | null;
  status: 'DRAFT' | 'SENT' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

interface Store {
  leads: LeadRecord[];
  batches: BatchRecord[];
  jobs: JobRecord[];
  enrichments: EnrichmentRecord[];
  deliverables: DeliverableRecord[];
  outreachMessages: OutreachRecord[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sortRecords<T extends { createdAt: Date }>(records: T[], orderBy?: { createdAt?: 'asc' | 'desc' }): T[] {
  if (!orderBy?.createdAt) return [...records];
  return [...records].sort((left, right) => {
    const delta = left.createdAt.getTime() - right.createdAt.getTime();
    return orderBy.createdAt === 'asc' ? delta : -delta;
  });
}

function valueMatches<T>(value: T, filter: unknown): boolean {
  if (filter === undefined) return true;
  if (filter && typeof filter === 'object') {
    const typedFilter = filter as Record<string, unknown>;
    if (typedFilter.contains !== undefined) {
      const actual = String(value ?? '');
      const expected = String(typedFilter.contains);
      return typedFilter.mode === 'insensitive'
        ? actual.toLowerCase().includes(expected.toLowerCase())
        : actual.includes(expected);
    }
    if (Array.isArray(typedFilter.in)) {
      return typedFilter.in.includes(value as never);
    }
    if (typedFilter.not !== undefined) {
      return value !== typedFilter.not;
    }
  }
  return value === filter;
}

function matchesWhere<T extends Record<string, unknown>>(record: T, where?: Record<string, unknown>): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, filter]) => {
    // Handle OR clauses
    if (key === 'OR' && Array.isArray(filter)) {
      return filter.some((clause: Record<string, unknown>) => matchesWhere(record, clause));
    }
    return valueMatches(record[key], filter);
  });
}

function applySelection<T extends Record<string, unknown>>(
  record: T,
  selection?: { select?: Record<string, boolean> }
): Partial<T> | T {
  if (!selection?.select) return clone(record);
  const picked: Partial<T> = {};
  for (const [key, enabled] of Object.entries(selection.select)) {
    if (enabled) {
      picked[key as keyof T] = clone(record[key as keyof T]);
    }
  }
  return picked;
}

function createMockPrisma() {
  const store: Store = {
    leads: [],
    batches: [],
    jobs: [],
    enrichments: [],
    deliverables: [],
    outreachMessages: [],
  };

  function decorateLead(lead: LeadRecord, include?: Record<string, unknown>) {
    const result: Record<string, unknown> = clone(lead);
    if (!include) return result;

    if (include.enrichment) {
      result.enrichment = clone(store.enrichments.find((item) => item.leadId === lead.id) ?? null);
    }
    if (include.jobs) {
      const jobs = sortRecords(
        store.jobs.filter((item) => item.leadId === lead.id),
        include.jobs && typeof include.jobs === 'object' ? (include.jobs as { orderBy?: { createdAt?: 'asc' | 'desc' } }).orderBy : undefined
      );
      result.jobs = clone(jobs);
    }
    if (include.deliverables) {
      const deliverables = store.deliverables.filter((item) => item.leadId === lead.id);
      if (typeof include.deliverables === 'object' && (include.deliverables as Record<string, unknown>).select) {
        result.deliverables = deliverables.map((item) => applySelection(item, include.deliverables as { select: Record<string, boolean> }));
      } else {
        result.deliverables = clone(deliverables);
      }
    }
    if (include.outreach) {
      const outreach = store.outreachMessages.find((item) => item.leadId === lead.id) ?? null;
      if (typeof include.outreach === 'object' && (include.outreach as Record<string, unknown>).select && outreach) {
        result.outreach = applySelection(outreach, include.outreach as { select: Record<string, boolean> });
      } else {
        result.outreach = clone(outreach);
      }
    }

    return result;
  }

  function decorateJob(job: JobRecord, include?: Record<string, unknown>) {
    const result: Record<string, unknown> = clone(job);
    if (!include) return result;

    if (include.lead) {
      const lead = store.leads.find((item) => item.id === job.leadId);
      result.lead = lead
        ? typeof include.lead === 'object' && (include.lead as Record<string, unknown>).select
          ? applySelection(lead, include.lead as { select: Record<string, boolean> })
          : clone(lead)
        : null;
    }
    if (include.deliverables) {
      result.deliverables = clone(store.deliverables.filter((item) => item.jobId === job.id));
    }

    return result;
  }

  return {
    $transaction: async <T>(operations: Array<Promise<T>>) => Promise.all(operations),
    lead: {
      create: async ({ data }: { data: Partial<LeadRecord> }) => {
        const now = new Date();
        const record: LeadRecord = {
          id: String(data.id ?? randomUUID()),
          batchId: (data.batchId as string | null | undefined) ?? null,
          userId: String(data.userId ?? 'test-user-00000000-0000-0000-0000-000000000001'),
          businessName: String(data.businessName ?? ''),
          category: (data.category as string | null | undefined) ?? null,
          address: (data.address as string | null | undefined) ?? null,
          phone: (data.phone as string | null | undefined) ?? null,
          website: (data.website as string | null | undefined) ?? null,
          email: (data.email as string | null | undefined) ?? null,
          rating: (data.rating as number | null | undefined) ?? null,
          socials: (data.socials as string | null | undefined) ?? null,
          hours: (data.hours as string | null | undefined) ?? null,
          metadata: (data.metadata as Record<string, unknown> | undefined) ?? {},
          solutionType: (data.solutionType as SolutionType | undefined) ?? null,
          status: (data.status as LeadStatus | undefined) ?? 'PENDING',
          createdAt: now,
          updatedAt: now,
        };
        store.leads.push(record);
        return clone(record);
      },
      findMany: async ({ where, include, select, orderBy, skip = 0, take }: Record<string, unknown> = {}) => {
        let records = store.leads.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, where as Record<string, unknown> | undefined));
        records = sortRecords(records, orderBy as { createdAt?: 'asc' | 'desc' } | undefined);
        const sliced = records.slice(Number(skip) || 0, take ? (Number(skip) || 0) + Number(take) : undefined);
        if (select) {
          return sliced.map((item) => applySelection(item, { select: select as Record<string, boolean> }));
        }
        return sliced.map((item) => decorateLead(item, include as Record<string, unknown> | undefined));
      },
      count: async ({ where }: Record<string, unknown> = {}) => {
        return store.leads.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, where as Record<string, unknown> | undefined)).length;
      },
      findUnique: async ({ where, include }: Record<string, unknown>) => {
        const record = store.leads.find((item) => item.id === (where as { id?: string }).id);
        return record ? decorateLead(record, include as Record<string, unknown> | undefined) : null;
      },
      update: async ({ where, data }: Record<string, unknown>) => {
        const record = store.leads.find((item) => item.id === (where as { id?: string }).id);
        if (!record) {
          throw new Error('Lead not found');
        }
        Object.assign(record, data, { updatedAt: new Date() });
        return clone(record);
      },
      findFirst: async ({ where, orderBy, include }: Record<string, unknown> = {}) => {
        const record = sortRecords(
          store.leads.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, where as Record<string, unknown> | undefined)),
          orderBy as { createdAt?: 'asc' | 'desc' } | undefined
        )[0];
        return record ? decorateLead(record, include as Record<string, unknown> | undefined) : null;
      },
    },
    batch: {
      create: async ({ data }: { data: Partial<BatchRecord> }) => {
        const now = new Date();
        const record: BatchRecord = {
          id: String(data.id ?? randomUUID()),
          name: (data.name as string | null | undefined) ?? null,
          userId: String(data.userId ?? 'test-user-00000000-0000-0000-0000-000000000001'),
          solutionType: (data.solutionType as Exclude<SolutionType, null> | undefined) ?? 'AI_AGENT',
          totalLeads: Number(data.totalLeads ?? 0),
          completed: Number(data.completed ?? 0),
          failed: Number(data.failed ?? 0),
          inProgress: Number(data.inProgress ?? 0),
          status: (data.status as BatchStatus | undefined) ?? 'PENDING',
          createdAt: now,
          updatedAt: now,
        };
        store.batches.push(record);
        return clone(record);
      },
      findMany: async ({ where, orderBy }: Record<string, unknown> = {}) => {
        let records = store.batches.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, where as Record<string, unknown> | undefined));
        return sortRecords(records, orderBy as { createdAt?: 'asc' | 'desc' } | undefined).map(clone);
      },
      findUnique: async ({ where }: Record<string, unknown>) => {
        const record = store.batches.find((item) => item.id === (where as { id?: string }).id);
        return record ? clone(record) : null;
      },
      findFirst: async ({ where }: Record<string, unknown> = {}) => {
        const record = store.batches.find((item) => matchesWhere(item as unknown as Record<string, unknown>, where as Record<string, unknown> | undefined));
        return record ? clone(record) : null;
      },
      update: async ({ where, data }: Record<string, unknown>) => {
        const record = store.batches.find((item) => item.id === (where as { id?: string }).id);
        if (!record) {
          throw new Error('Batch not found');
        }
        Object.assign(record, data, { updatedAt: new Date() });
        return clone(record);
      },
      count: async ({ where }: Record<string, unknown> = {}) => {
        return store.batches.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, where as Record<string, unknown> | undefined)).length;
      },
    },
    job: {
      create: async ({ data }: { data: Partial<JobRecord> }) => {
        const now = new Date();
        const record: JobRecord = {
          id: String(data.id ?? randomUUID()),
          leadId: String(data.leadId ?? ''),
          type: data.type as JobType,
          status: (data.status as JobStatus | undefined) ?? 'QUEUED',
          progress: Number(data.progress ?? 0),
          workerName: (data.workerName as string | null | undefined) ?? null,
          errorMsg: (data.errorMsg as string | null | undefined) ?? null,
          attempts: Number(data.attempts ?? 0),
          startedAt: (data.startedAt as Date | null | undefined) ?? null,
          completedAt: (data.completedAt as Date | null | undefined) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        store.jobs.push(record);
        return clone(record);
      },
      findMany: async ({ where, orderBy, take }: Record<string, unknown> = {}) => {
        const effectiveWhere = { ...(where as Record<string, unknown> || {}) };
        let records = store.jobs;

        // Handle nested relation filter { lead: { userId: ... } }
        if (effectiveWhere.lead && typeof effectiveWhere.lead === 'object') {
          const leadFilter = effectiveWhere.lead as Record<string, unknown>;
          records = records.filter((job) => {
            const lead = store.leads.find((l) => l.id === job.leadId);
            return lead ? matchesWhere(lead as unknown as Record<string, unknown>, leadFilter) : false;
          });
          delete effectiveWhere.lead;
        }

        records = records.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, effectiveWhere));
        records = sortRecords(records, orderBy as { createdAt?: 'asc' | 'desc' } | undefined);
        if (take) {
          records = records.slice(0, Number(take));
        }
        return records.map(clone);
      },
      findUnique: async ({ where, include }: Record<string, unknown>) => {
        const record = store.jobs.find((item) => item.id === (where as { id?: string }).id);
        return record ? decorateJob(record, include as Record<string, unknown> | undefined) : null;
      },
      update: async ({ where, data }: Record<string, unknown>) => {
        const record = store.jobs.find((item) => item.id === (where as { id?: string }).id);
        if (!record) {
          throw new Error('Job not found');
        }
        Object.assign(record, data, { updatedAt: new Date() });
        return clone(record);
      },
      findFirst: async ({ where, orderBy }: Record<string, unknown> = {}) => {
        const effectiveWhere = { ...(where as Record<string, unknown> || {}) };
        let records = store.jobs;

        if (effectiveWhere.lead && typeof effectiveWhere.lead === 'object') {
          const leadFilter = effectiveWhere.lead as Record<string, unknown>;
          records = records.filter((job) => {
            const lead = store.leads.find((l) => l.id === job.leadId);
            return lead ? matchesWhere(lead as unknown as Record<string, unknown>, leadFilter) : false;
          });
          delete effectiveWhere.lead;
        }

        const record = sortRecords(
          records.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, effectiveWhere)),
          orderBy as { createdAt?: 'asc' | 'desc' } | undefined
        )[0];
        return record ? clone(record) : null;
      },
      count: async ({ where }: Record<string, unknown> = {}) => {
        const effectiveWhere = { ...(where as Record<string, unknown> || {}) };
        let records = store.jobs;

        if (effectiveWhere.lead && typeof effectiveWhere.lead === 'object') {
          const leadFilter = effectiveWhere.lead as Record<string, unknown>;
          records = records.filter((job) => {
            const lead = store.leads.find((l) => l.id === job.leadId);
            return lead ? matchesWhere(lead as unknown as Record<string, unknown>, leadFilter) : false;
          });
          delete effectiveWhere.lead;
        }

        return records.filter((item) => matchesWhere(item as unknown as Record<string, unknown>, effectiveWhere)).length;
      },
    },
    enrichment: {
      upsert: async ({ where, create, update }: Record<string, unknown>) => {
        const existing = store.enrichments.find((item) => item.leadId === (where as { leadId?: string }).leadId);
        if (existing) {
          Object.assign(existing, update);
          return clone(existing);
        }
        const record: EnrichmentRecord = {
          id: randomUUID(),
          leadId: String((create as { leadId?: string }).leadId ?? ''),
          businessSummary: ((create as Record<string, unknown>).businessSummary as string | null | undefined) ?? null,
          services: (((create as Record<string, unknown>).services as string[] | undefined) ?? []).slice(),
          targetAudience: ((create as Record<string, unknown>).targetAudience as string | null | undefined) ?? null,
          painPoints: (((create as Record<string, unknown>).painPoints as string[] | undefined) ?? []).slice(),
          opportunities: (((create as Record<string, unknown>).opportunities as string[] | undefined) ?? []).slice(),
          digitalPresenceScore: Number((create as Record<string, unknown>).digitalPresenceScore ?? 0),
          maturityLevel: ((create as Record<string, unknown>).maturityLevel as string | null | undefined) ?? null,
          decisionMakerRole: ((create as Record<string, unknown>).decisionMakerRole as string | null | undefined) ?? null,
          socialProfiles: ((create as Record<string, unknown>).socialProfiles as Record<string, unknown> | undefined) ?? {},
          competitorInsights: ((create as Record<string, unknown>).competitorInsights as string | null | undefined) ?? null,
          createdAt: new Date(),
        };
        store.enrichments.push(record);
        return clone(record);
      },
    },
    deliverable: {
      create: async ({ data }: { data: Partial<DeliverableRecord> }) => {
        const now = new Date();
        const record: DeliverableRecord = {
          id: String(data.id ?? randomUUID()),
          leadId: String(data.leadId ?? ''),
          jobId: String(data.jobId ?? ''),
          type: data.type as DeliverableType,
          title: (data.title as string | null | undefined) ?? null,
          content: (data.content as Record<string, unknown> | undefined) ?? {},
          summary: (data.summary as string | null | undefined) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        store.deliverables.push(record);
        return clone(record);
      },
    },
    outreachMessage: {
      upsert: async ({ where, create, update }: Record<string, unknown>) => {
        const existing = store.outreachMessages.find((item) => item.leadId === (where as { leadId?: string }).leadId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return clone(existing);
        }
        const now = new Date();
        const record: OutreachRecord = {
          id: randomUUID(),
          leadId: String((create as { leadId?: string }).leadId ?? ''),
          subject: String((create as { subject?: string }).subject ?? ''),
          body: String((create as { body?: string }).body ?? ''),
          toName: ((create as { toName?: string | null }).toName) ?? null,
          toEmail: ((create as { toEmail?: string | null }).toEmail) ?? null,
          status: 'DRAFT',
          createdAt: now,
          updatedAt: now,
        };
        store.outreachMessages.push(record);
        return clone(record);
      },
    },
  };
}

process.env.NODE_ENV = 'test';
process.env.VERCEL = '1';

const TEST_USER_ID = 'test-user-00000000-0000-0000-0000-000000000001';
const TEST_USER_EMAIL = 'test@e2e.local';

// Mock auth to bypass JWT verification in tests
vi.mock('../server/src/lib/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { userId: TEST_USER_ID, email: TEST_USER_EMAIL };
    next();
  },
  signToken: () => 'mock-jwt-token',
  verifyToken: () => ({ userId: TEST_USER_ID, email: TEST_USER_EMAIL }),
}));

vi.mock('../server/src/lib/prisma', () => ({
  prisma: createMockPrisma(),
}));

// Mock plan limits to allow unlimited processing in tests
vi.mock('../server/src/lib/plan-limits', () => ({
  getPlanLimits: (plan: string) => ({ maxProcessedLeads: Infinity, maxDeployments: Infinity, label: plan }),
  getPlanUsage: async () => ({
    plan: 'free',
    label: 'Free',
    maxProcessedLeads: Infinity,
    processedLeads: 0,
    canProcess: true,
    remaining: Infinity,
    maxDeployments: Infinity,
    deploymentCount: 0,
    canDeploy: true,
  }),
  getAllowedProcessCount: async (_userId: string, requested: number) => requested,
}));

vi.mock('../server/src/services/llm', () => ({
  generateCompletion: async (systemPrompt: string) => {
    if (systemPrompt.includes('digital presence assessment')) {
      return JSON.stringify({
        businessSummary: 'A local business with a basic digital presence and clear growth potential.',
        services: ['Consultation', 'Customer support'],
        targetAudience: 'Local customers searching online for trusted providers.',
        painPoints: ['Limited online visibility', 'Manual follow-up workload'],
        opportunities: ['Improve conversion flow', 'Automate lead capture'],
        digitalPresenceScore: 42,
        maturityLevel: 'growing',
        decisionMakerRole: 'Owner',
        competitorInsights: 'Competitors appear to invest more heavily in web conversion and automation.',
      });
    }

    if (systemPrompt.includes('AI solutions architect')) {
      return JSON.stringify({
        agentName: 'GenX Assistant',
        agentType: 'Customer Support Bot',
        overview: 'A tailored AI agent that answers common questions and captures qualified leads.',
        useCase: 'Automate repetitive customer inquiries and qualification.',
        painPointsAddressed: ['Limited online visibility → always-on responses'],
        capabilities: [{ name: 'FAQ automation', description: 'Answers common questions', businessImpact: 'Faster response times' }],
        intents: [{ name: 'BookConsultation', description: 'Handle booking requests', sampleUtterances: ['I want to book'], sampleResponse: 'I can help with that.' }],
        integrations: ['Website chat - customer support'],
        architecture: { components: ['Chat UI', 'Knowledge base'], techStack: 'Node.js + React', deployment: 'Cloud-hosted' },
        roi: { timeSaved: '5 hours/week', leadIncrease: '10%', costReduction: '15%', summary: 'Reduced manual follow-up and faster lead response.' },
        implementationPlan: { phase1: 'Discovery', phase2: 'Build', phase3: 'Launch' },
        sampleDialogues: [{ scenario: 'Customer question', conversation: [{ role: 'user', message: 'Do you offer support?' }, { role: 'agent', message: 'Yes, here is how we can help.' }] }],
      });
    }

    return JSON.stringify({
      proposalTitle: 'Website Improvement Proposal',
      executiveSummary: 'A focused redesign to improve trust, conversion, and local discoverability.',
      currentSiteAudit: {
        hasWebsite: true,
        overallScore: 58,
        uxIssues: ['Weak call-to-action'],
        seoGaps: ['Thin service content'],
        performanceIssues: ['Large images'],
        conversionProblems: ['No prominent lead form'],
        mobileIssues: ['Crowded header'],
        positives: ['Clear brand presence'],
      },
      proposedStructure: {
        pages: [{ name: 'Home', purpose: 'Explain the offer', sections: ['Hero', 'Services'], conversionElements: ['Primary CTA'] }],
      },
      designRecommendations: {
        style: 'Modern',
        colorPalette: 'High-contrast neutrals with one accent color',
        typography: 'Readable sans-serif pairing',
        imagery: 'Authentic business photography',
        keyFeatures: ['Lead form - increase conversion'],
      },
      seoStrategy: {
        targetKeywords: ['local business services'],
        metaStrategy: 'Service and location focused',
        contentStrategy: 'Expand service pages',
        localSeo: 'Improve local signals',
        technicalSeo: ['Fix headings'],
      },
      conversionOptimization: {
        primaryCta: 'Book a consultation',
        leadCapture: 'Short contact form',
        trustElements: ['Reviews'],
        urgencyTactics: 'Limited-time consultation prompt',
      },
      techStack: {
        recommended: 'React',
        reasoning: 'Fast and maintainable',
        hosting: 'Vercel',
        estimatedPerformance: 'Improved Core Web Vitals',
      },
      implementationPlan: { phase1: 'Discovery', phase2: 'Build', phase3: 'Content', phase4: 'Launch' },
      roi: {
        trafficIncrease: '15%',
        conversionImprovement: '12%',
        revenueImpact: 'Moderate uplift',
        summary: 'Better visibility and stronger conversion paths.',
      },
    });
  },
  generateText: async (_systemPrompt: string, userPrompt: string) => {
    // Extract business name from the user prompt for personalized outreach
    const nameMatch = userPrompt.match(/[-\s]Name:\s*(.+)/i);
    const businessName = nameMatch ? nameMatch[1].trim() : 'your business';
    return `Subject: Quick idea for ${businessName}\n\nI took a close look at ${businessName} and noticed a few practical opportunities to improve your online conversion flow. Your current setup is solid, but a few targeted changes could significantly boost how customers find and engage with you.\n\nIf useful, I can share a short plan tailored specifically to ${businessName}.\n\nBest regards,\n[Your Name], Solutions Architect at GenX`;
  },
}));

let server: Server;

beforeAll(async () => {
  const { default: app } = await import('../server/src/index');
  server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start test server');
  }

  process.env.BASE_URL = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});