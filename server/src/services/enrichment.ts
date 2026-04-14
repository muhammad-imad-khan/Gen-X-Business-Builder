import { Lead, Enrichment } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateCompletion } from './llm';
import { logger } from '../lib/logger';
import * as cheerio from 'cheerio';

const ENRICHMENT_SYSTEM_PROMPT = `You are a senior business analyst specializing in digital presence assessment and B2B intelligence.

Your job: Given a business's scraped data and any fetched website content, produce a comprehensive enrichment profile.

Return valid JSON with this exact structure:
{
  "businessSummary": "2-3 sentence summary of the business, what they do, and their market position",
  "services": ["service1", "service2", ...],
  "targetAudience": "Description of their ideal customer",
  "painPoints": ["pain1", "pain2", ...],
  "opportunities": ["opp1", "opp2", ...],
  "digitalPresenceScore": 0-100,
  "maturityLevel": "startup | growing | established | enterprise",
  "decisionMakerRole": "Best guess at decision-maker title (e.g., Owner, Marketing Manager)",
  "competitorInsights": "Brief competitive landscape analysis"
}

Guidelines:
- Pain points should focus on digital/tech gaps (no website, outdated site, no automation, poor SEO, no online booking, etc.)
- Opportunities should be actionable and tied to pain points
- Digital presence score: 0-20 (no web presence), 21-40 (basic), 41-60 (moderate), 61-80 (good), 81-100 (excellent)
- Be specific to the business, NOT generic
- If data is limited, make reasonable inferences from the category and location`;

export async function enrichLead(lead: Lead): Promise<Enrichment> {
  logger.info({ leadId: lead.id, business: lead.businessName }, 'Starting enrichment');

  let websiteContent = '';
  if (lead.website) {
    websiteContent = await fetchWebsiteContent(lead.website);
  }

  const userPrompt = buildEnrichmentPrompt(lead, websiteContent);

  const raw = await generateCompletion(ENRICHMENT_SYSTEM_PROMPT, userPrompt, {
    temperature: 0.5,
    maxTokens: 2000,
  });

  const parsed = JSON.parse(raw);

  const enrichment = await prisma.enrichment.upsert({
    where: { leadId: lead.id },
    create: {
      leadId: lead.id,
      businessSummary: parsed.businessSummary || null,
      services: parsed.services || [],
      targetAudience: parsed.targetAudience || null,
      painPoints: parsed.painPoints || [],
      opportunities: parsed.opportunities || [],
      digitalPresenceScore: parsed.digitalPresenceScore || 0,
      maturityLevel: parsed.maturityLevel || null,
      decisionMakerRole: parsed.decisionMakerRole || null,
      competitorInsights: parsed.competitorInsights || null,
    },
    update: {
      businessSummary: parsed.businessSummary || null,
      services: parsed.services || [],
      targetAudience: parsed.targetAudience || null,
      painPoints: parsed.painPoints || [],
      opportunities: parsed.opportunities || [],
      digitalPresenceScore: parsed.digitalPresenceScore || 0,
      maturityLevel: parsed.maturityLevel || null,
      decisionMakerRole: parsed.decisionMakerRole || null,
      competitorInsights: parsed.competitorInsights || null,
    },
  });

  logger.info({ leadId: lead.id, score: enrichment.digitalPresenceScore }, 'Enrichment complete');
  return enrichment;
}

function buildEnrichmentPrompt(lead: Lead, websiteContent: string): string {
  const parts: string[] = [
    `Business Name: ${lead.businessName}`,
    lead.category ? `Category: ${lead.category}` : '',
    lead.address ? `Location: ${lead.address}` : '',
    lead.phone ? `Phone: ${lead.phone}` : 'Phone: Not available',
    lead.website ? `Website: ${lead.website}` : 'Website: None found',
    lead.email ? `Email: ${lead.email}` : '',
    lead.rating ? `Rating: ${lead.rating}/5` : '',
    lead.socials ? `Social Media: ${lead.socials}` : 'Social Media: None found',
    lead.hours ? `Business Hours: ${lead.hours}` : '',
  ];

  if (lead.metadata && typeof lead.metadata === 'object') {
    const meta = lead.metadata as Record<string, unknown>;
    if (Object.keys(meta).length > 0) {
      parts.push(`Additional metadata: ${JSON.stringify(meta)}`);
    }
  }

  if (websiteContent) {
    parts.push(`\n--- Website Content (excerpt) ---\n${websiteContent.slice(0, 3000)}`);
  }

  return parts.filter(Boolean).join('\n');
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GenX-Enrichment-Bot/1.0 (Business Intelligence)',
        Accept: 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return '';

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer for cleaner text
    $('script, style, nav, footer, header, iframe, noscript').remove();

    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text().trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);

    return [
      title ? `Page Title: ${title}` : '',
      metaDesc ? `Meta Description: ${metaDesc}` : '',
      h1 ? `Main Heading: ${h1}` : '',
      `Body Content: ${bodyText}`,
    ]
      .filter(Boolean)
      .join('\n');
  } catch {
    logger.debug({ url }, 'Failed to fetch website content');
    return '';
  }
}
