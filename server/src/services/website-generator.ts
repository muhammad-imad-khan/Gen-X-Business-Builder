import { Lead, Enrichment } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateCompletion } from './llm';
import { logger } from '../lib/logger';

const WEBSITE_SYSTEM_PROMPT = `You are a senior web strategist and UX consultant. Your job is to analyze a business's online presence and generate a comprehensive website improvement or redesign proposal.

Return valid JSON with this exact structure:
{
  "proposalTitle": "Website [Improvement/Redesign] Proposal for [Business Name]",
  "executiveSummary": "2-3 paragraph summary of findings and recommendations",
  "currentSiteAudit": {
    "hasWebsite": true/false,
    "overallScore": 0-100,
    "uxIssues": ["issue1", "issue2"],
    "seoGaps": ["gap1", "gap2"],
    "performanceIssues": ["issue1", "issue2"],
    "conversionProblems": ["problem1", "problem2"],
    "mobileIssues": ["issue1", "issue2"],
    "positives": ["positive1", "positive2"]
  },
  "proposedStructure": {
    "pages": [
      {
        "name": "Page Name",
        "purpose": "What this page does",
        "sections": ["Section 1", "Section 2"],
        "conversionElements": ["CTA or conversion element"]
      }
    ]
  },
  "designRecommendations": {
    "style": "Modern / Minimal / Bold / etc.",
    "colorPalette": "Suggested colors and reasoning",
    "typography": "Font recommendations",
    "imagery": "Image style recommendations",
    "keyFeatures": ["Feature 1 - reason", "Feature 2 - reason"]
  },
  "seoStrategy": {
    "targetKeywords": ["keyword1", "keyword2"],
    "metaStrategy": "Title/description approach",
    "contentStrategy": "Blog, landing pages, etc.",
    "localSeo": "Local SEO recommendations",
    "technicalSeo": ["Technical fix 1", "Technical fix 2"]
  },
  "conversionOptimization": {
    "primaryCta": "Main call-to-action and placement",
    "leadCapture": "How to capture leads",
    "trustElements": ["Testimonials", "Reviews", "Certifications"],
    "urgencyTactics": "Appropriate urgency elements"
  },
  "techStack": {
    "recommended": "Recommended technology",
    "reasoning": "Why this stack",
    "hosting": "Hosting recommendation",
    "estimatedPerformance": "Expected speed improvements"
  },
  "implementationPlan": {
    "phase1": "Discovery & Design (Week 1-2)",
    "phase2": "Development (Week 3-5)",
    "phase3": "Content & SEO (Week 6)",
    "phase4": "Testing & Launch (Week 7-8)"
  },
  "roi": {
    "trafficIncrease": "Expected organic traffic increase",
    "conversionImprovement": "Expected conversion rate improvement",
    "revenueImpact": "Estimated revenue impact",
    "summary": "One paragraph business impact summary"
  }
}

Requirements:
- If the business has NO website, propose a full new site design
- If they HAVE a website, provide specific audit findings and improvements
- All recommendations must be specific to their industry and business type
- Include business-specific keywords and content suggestions
- ROI must be realistic and grounded in their business context`;

export async function generateWebsiteProposal(lead: Lead, enrichment: Enrichment): Promise<Record<string, unknown>> {
  logger.info({ leadId: lead.id, business: lead.businessName }, 'Generating website proposal');

  const userPrompt = buildWebsitePrompt(lead, enrichment);

  const raw = await generateCompletion(WEBSITE_SYSTEM_PROMPT, userPrompt, {
    temperature: 0.7,
    maxTokens: 4000,
  });

  const proposal = JSON.parse(raw);

  const deliverable = await prisma.deliverable.create({
    data: {
      leadId: lead.id,
      jobId: (await getActiveJobId(lead.id, 'WEBSITE_GENERATION'))!,
      type: 'WEBSITE_PROPOSAL',
      title: proposal.proposalTitle || `Website Proposal - ${lead.businessName}`,
      content: proposal,
      summary: proposal.executiveSummary?.slice(0, 500) || null,
    },
  });

  logger.info({ leadId: lead.id, deliverableId: deliverable.id }, 'Website proposal generated');
  return proposal;
}

function buildWebsitePrompt(lead: Lead, enrichment: Enrichment): string {
  return `Generate a tailored website proposal for this business:

BUSINESS PROFILE:
- Name: ${lead.businessName}
- Category: ${lead.category || 'Unknown'}
- Location: ${lead.address || 'Unknown'}
- Website: ${lead.website || 'NO EXISTING WEBSITE'}
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
- Social Profiles: ${JSON.stringify(enrichment.socialProfiles) || '{}'}

Create a highly specific website proposal that addresses their actual digital gaps and business needs.`;
}

async function getActiveJobId(leadId: string, jobType: string): Promise<string | null> {
  const job = await prisma.job.findFirst({
    where: { leadId, type: jobType as any, status: { in: ['QUEUED', 'RUNNING'] } },
    orderBy: { createdAt: 'desc' },
  });
  return job?.id || null;
}
