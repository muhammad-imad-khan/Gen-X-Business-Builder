import { Lead, Enrichment } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateCompletion } from './llm';
import { logger } from '../lib/logger';

const AI_AGENT_SYSTEM_PROMPT = `You are a world-class AI solutions architect. Your job is to design a tailored AI Agent solution for a specific business based on their enrichment profile.

Return valid JSON with this exact structure:
{
  "agentName": "A catchy name for the AI agent (e.g., 'AcmeBot', 'BookingBuddy')",
  "agentType": "Primary function (e.g., 'Customer Support Bot', 'Lead Qualification Agent', 'Booking Assistant')",
  "overview": "2-3 paragraph overview of the agent, what it does, and why this business needs it",
  "useCase": "The primary use case mapped directly to a identified pain point",
  "painPointsAddressed": ["pain1 → solution1", "pain2 → solution2"],
  "capabilities": [
    {
      "name": "Capability name",
      "description": "What it does",
      "businessImpact": "How it helps this specific business"
    }
  ],
  "intents": [
    {
      "name": "IntentName",
      "description": "What triggers this intent",
      "sampleUtterances": ["example1", "example2"],
      "sampleResponse": "How the agent would respond"
    }
  ],
  "integrations": ["Integration 1 - purpose", "Integration 2 - purpose"],
  "architecture": {
    "components": ["Component 1", "Component 2"],
    "techStack": "Recommended tech",
    "deployment": "How to deploy"
  },
  "roi": {
    "timeSaved": "Estimated time saved per week",
    "leadIncrease": "Estimated lead/engagement increase",
    "costReduction": "Estimated cost reduction",
    "summary": "One paragraph ROI summary"
  },
  "implementationPlan": {
    "phase1": "Discovery & Setup (Week 1-2)",
    "phase2": "Core Development (Week 3-4)",
    "phase3": "Testing & Launch (Week 5-6)"
  },
  "sampleDialogues": [
    {
      "scenario": "Scenario description",
      "conversation": [
        {"role": "user", "message": "User message"},
        {"role": "agent", "message": "Agent response"}
      ]
    }
  ]
}

Requirements:
- EVERY field must be specific to THIS business (reference their name, services, industry, pain points)
- Do NOT produce generic templates. If the business is a dentist, talk about appointment scheduling; if a restaurant, talk about reservations and menu queries
- The ROI section must contain believable, business-specific numbers
- Sample dialogues must reference the actual business and its services
- Capabilities must solve the actual identified pain points`;

export async function generateAIAgentSpec(lead: Lead, enrichment: Enrichment): Promise<Record<string, unknown>> {
  logger.info({ leadId: lead.id, business: lead.businessName }, 'Generating AI Agent spec');

  const userPrompt = buildAIAgentPrompt(lead, enrichment);

  const raw = await generateCompletion(AI_AGENT_SYSTEM_PROMPT, userPrompt, {
    temperature: 0.7,
    maxTokens: 4000,
  });

  const spec = JSON.parse(raw);

  const deliverable = await prisma.deliverable.create({
    data: {
      leadId: lead.id,
      jobId: (await getActiveJobId(lead.id, 'AI_AGENT_GENERATION'))!,
      type: 'AI_AGENT_SPEC',
      title: `${spec.agentName || 'AI Agent'} - ${lead.businessName}`,
      content: spec,
      summary: spec.overview?.slice(0, 500) || null,
    },
  });

  logger.info({ leadId: lead.id, deliverableId: deliverable.id }, 'AI Agent spec generated');
  return spec;
}

function buildAIAgentPrompt(lead: Lead, enrichment: Enrichment): string {
  return `Generate a tailored AI Agent specification for this business:

BUSINESS PROFILE:
- Name: ${lead.businessName}
- Category: ${lead.category || 'Unknown'}
- Location: ${lead.address || 'Unknown'}
- Website: ${lead.website || 'None'}
- Rating: ${lead.rating || 'N/A'}
- Phone: ${lead.phone || 'N/A'}

ENRICHMENT DATA:
- Summary: ${enrichment.businessSummary || 'N/A'}
- Services: ${enrichment.services.join(', ') || 'Unknown'}
- Target Audience: ${enrichment.targetAudience || 'Unknown'}
- Pain Points: ${enrichment.painPoints.join(', ') || 'None identified'}
- Opportunities: ${enrichment.opportunities.join(', ') || 'None identified'}
- Digital Presence Score: ${enrichment.digitalPresenceScore}/100
- Maturity Level: ${enrichment.maturityLevel || 'Unknown'}
- Decision Maker Role: ${enrichment.decisionMakerRole || 'Owner'}
- Social Profiles: ${JSON.stringify(enrichment.socialProfiles) || '{}'}

Create a highly personalized AI agent that directly addresses their pain points and business needs.`;
}

async function getActiveJobId(leadId: string, jobType: string): Promise<string | null> {
  const job = await prisma.job.findFirst({
    where: { leadId, type: jobType as any, status: { in: ['QUEUED', 'RUNNING'] } },
    orderBy: { createdAt: 'desc' },
  });
  return job?.id || null;
}
