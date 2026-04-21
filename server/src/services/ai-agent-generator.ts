import { Lead, Enrichment } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateCompletion } from './llm';
import { logger } from '../lib/logger';

const AI_AGENT_SYSTEM_PROMPT = `You are a world-class AI solutions architect who has built and deployed 100+ production AI agents for real businesses. You understand how businesses actually operate day-to-day — handling phone calls, managing walk-ins, scheduling, taking payments, answering repetitive questions, following up on leads, and dealing with no-shows.

Your job: Design a REALISTIC, IMMEDIATELY USEFUL AI agent for a specific business based on their enrichment profile. This is NOT a theoretical exercise — the business owner needs to read this and think "Yes, this solves my actual daily problems."

CRITICAL REALISM RULES:
1. UNDERSTAND THE BUSINESS FIRST: Before designing anything, think about what a typical day looks like for this business. What tasks eat up time? What falls through the cracks? Where do they lose money?
2. MATCH THE BUSINESS SIZE: A local pizza shop doesn't need enterprise-grade NLP. A dental clinic doesn't need a full CRM integration on day one. Scale the solution to the business.
3. SOLVE REAL PROBLEMS: Don't propose features the business doesn't need. A plumber doesn't need a "menu ordering system." A restaurant doesn't need "field service scheduling."
4. USE THEIR ACTUAL DATA: Reference their real services, their real hours, their real location, their actual reviews/rating. The agent should feel like it was hand-built for THIS business.
5. REALISTIC CONVERSATIONS: Sample dialogues must sound like real customers of THIS specific business. Use natural language, common questions people actually ask in this industry.
6. HONEST ROI: Don't exaggerate. A small business saving 5-10 hours/week is huge. Don't claim "500% revenue increase."

INDUSTRY-SPECIFIC THINKING:
- Restaurants/Food: Focus on reservations, menu inquiries, dietary questions, wait times, delivery status, catering requests
- Medical/Dental/Health: Focus on appointment booking, insurance questions, procedure info, post-care instructions, emergency triage
- Home Services (plumber, electrician, HVAC): Focus on service requests, emergency availability, estimate requests, scheduling windows
- Legal: Focus on consultation booking, case type screening, document collection, office hours
- Automotive: Focus on service booking, repair status updates, parts availability, recall notifications
- Fitness/Wellness: Focus on class scheduling, membership inquiries, trainer booking, facility info
- Real Estate: Focus on property inquiries, viewing scheduling, qualification questions, neighborhood info
- Retail: Focus on product availability, store hours, return policy, order tracking
- Beauty/Salon: Focus on appointment booking, service menu, stylist availability, pricing

Return valid JSON with this exact structure:
{
  "agentName": "A name that fits the business brand (use their actual name creatively, e.g., for 'Mario's Pizza' → 'Mario's Assistant')",
  "agentType": "Primary function matched to their biggest pain point",
  "overview": "2-3 paragraphs explaining WHY this business needs this agent. Reference their actual pain points, their rating, their digital presence gaps. Explain what changes for them on day 1.",
  "useCase": "The single most impactful use case, explained in terms of their daily operations",
  "painPointsAddressed": ["specific pain → how the agent solves it in practice"],
  "capabilities": [
    {
      "name": "Capability name",
      "description": "What it actually does in plain language",
      "businessImpact": "Concrete impact (e.g., 'Handles the ~20 calls/day asking about hours and availability, freeing up your front desk staff')"
    }
  ],
  "intents": [
    {
      "name": "IntentName",
      "description": "Real scenario that triggers this",
      "sampleUtterances": ["How real customers would actually phrase this (use casual language, typos are OK)", "Another natural way to say it"],
      "sampleResponse": "Response that sounds human, references actual business details (hours, location, services)"
    }
  ],
  "integrations": ["Integration - specific purpose for THIS business"],
  "architecture": {
    "components": ["Component with explanation"],
    "techStack": "Practical tech recommendation scaled to business size",
    "deployment": "Simple, realistic deployment approach (not enterprise-grade for a small shop)"
  },
  "roi": {
    "timeSaved": "Realistic weekly time saved based on business type and size",
    "leadIncrease": "Conservative, believable engagement improvement",
    "costReduction": "Honest cost comparison (agent vs. current approach)",
    "summary": "Grounded ROI paragraph referencing their actual situation"
  },
  "implementationPlan": {
    "phase1": "Week 1-2: Specific to their business setup",
    "phase2": "Week 3-4: Core features they actually need",
    "phase3": "Week 5-6: Testing with their real customer scenarios"
  },
  "sampleDialogues": [
    {
      "scenario": "A realistic customer scenario for THIS business",
      "conversation": [
        {"role": "user", "message": "Natural customer message referencing their actual business"},
        {"role": "agent", "message": "Helpful response using real business details (name, services, hours, location)"}
      ]
    }
  ]
}

FINAL CHECK: Before outputting, verify that:
- You used the business name in agent responses
- Sample dialogues reference their actual services/category
- Capabilities match their identified pain points, not generic features
- ROI numbers are conservative and believable for their business size
- The agent type makes sense for their industry (not a generic chatbot)`;

export async function generateAIAgentSpec(lead: Lead, enrichment: Enrichment): Promise<Record<string, unknown>> {
  logger.info({ leadId: lead.id, business: lead.businessName }, 'Generating AI Agent spec');

  const userPrompt = buildAIAgentPrompt(lead, enrichment);

  const raw = await generateCompletion(AI_AGENT_SYSTEM_PROMPT, userPrompt, {
    temperature: 0.7,
    maxTokens: 5000,
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
  const parts: string[] = [];

  parts.push(`Design a realistic AI agent for this specific business. Think about what their typical workday looks like and what problems an AI agent could actually solve for them.`);

  parts.push(`\nBUSINESS PROFILE:`);
  parts.push(`- Business Name: ${lead.businessName}`);
  parts.push(`- Industry/Category: ${lead.category || 'Unknown'}`);
  parts.push(`- Location: ${lead.address || 'Unknown'}`);
  parts.push(`- Website: ${lead.website || 'NO website (this is a major pain point — they handle everything by phone)'}`);
  parts.push(`- Rating: ${lead.rating ? `${lead.rating}/5 stars` : 'No online rating found'}`);
  parts.push(`- Phone: ${lead.phone || 'Not listed'}`);
  parts.push(`- Email: ${(lead as any).email || 'Not listed'}`);
  parts.push(`- Social Media: ${(lead as any).socials || 'None found'}`);
  parts.push(`- Business Hours: ${(lead as any).hours || 'Unknown'}`);

  parts.push(`\nBUSINESS INTELLIGENCE (from enrichment analysis):`);
  parts.push(`- Business Summary: ${enrichment.businessSummary || 'N/A'}`);
  parts.push(`- Services They Offer: ${enrichment.services.length > 0 ? enrichment.services.join(', ') : 'Unknown — infer from category'}`);
  parts.push(`- Who Their Customers Are: ${enrichment.targetAudience || 'Unknown — infer from category and location'}`);
  parts.push(`- Their Pain Points (what's holding them back): ${enrichment.painPoints.length > 0 ? enrichment.painPoints.join(' | ') : 'Unknown'}`);
  parts.push(`- Growth Opportunities: ${enrichment.opportunities.length > 0 ? enrichment.opportunities.join(' | ') : 'Unknown'}`);
  parts.push(`- Digital Presence Score: ${enrichment.digitalPresenceScore}/100 ${getDigitalScoreContext(enrichment.digitalPresenceScore || 0)}`);
  parts.push(`- Business Maturity: ${enrichment.maturityLevel || 'Unknown'}`);
  parts.push(`- Decision Maker: ${enrichment.decisionMakerRole || 'Owner/Manager'}`);
  parts.push(`- Competitor Insights: ${enrichment.competitorInsights || 'N/A'}`);

  if (enrichment.socialProfiles && typeof enrichment.socialProfiles === 'object') {
    const profiles = enrichment.socialProfiles as Record<string, unknown>;
    if (Object.keys(profiles).length > 0) {
      parts.push(`- Social Profiles: ${JSON.stringify(profiles)}`);
    }
  }

  parts.push(`\nIMPORTANT CONTEXT FOR YOUR DESIGN:`);
  if (!lead.website) {
    parts.push(`- This business has NO website. They likely handle most customer interactions by phone. The agent should be their first digital customer touchpoint.`);
  }
  if ((enrichment.digitalPresenceScore || 0) < 30) {
    parts.push(`- Very low digital presence. The agent should be simple and focus on the basics — answering common questions and capturing leads. Don't over-engineer.`);
  }
  if (lead.rating && lead.rating >= 4.5) {
    parts.push(`- High customer rating (${lead.rating}/5). The agent should maintain this quality of service. Leverage positive reviews in responses.`);
  }
  if (lead.rating && lead.rating < 3.5) {
    parts.push(`- Lower rating (${lead.rating}/5). The agent could help improve customer experience and response time, which may improve ratings.`);
  }

  parts.push(`\nDesign the most practical, immediately useful AI agent for THIS specific business. Focus on solving their real problems, not impressing with technology.`);

  return parts.join('\n');
}

function getDigitalScoreContext(score: number): string {
  if (score <= 20) return '(Minimal digital presence — they probably rely entirely on word-of-mouth and phone calls)';
  if (score <= 40) return '(Basic presence — maybe a simple website or social page, but not leveraging digital tools)';
  if (score <= 60) return '(Moderate — has some online presence but missing key digital capabilities)';
  if (score <= 80) return '(Good — has a functional online presence but room for automation)';
  return '(Strong — already digitally savvy, agent should add automation on top)';
}

async function getActiveJobId(leadId: string, jobType: string): Promise<string | null> {
  const job = await prisma.job.findFirst({
    where: { leadId, type: jobType as any, status: { in: ['QUEUED', 'RUNNING'] } },
    orderBy: { createdAt: 'desc' },
  });
  return job?.id || null;
}
