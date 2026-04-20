import { Lead, Enrichment, SolutionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateText } from './llm';
import { logger } from '../lib/logger';

const OUTREACH_SYSTEM_PROMPT = `You are an expert B2B sales copywriter. Write highly personalized, professional outreach emails that feel human, not robotic.

Rules:
- Address the decision-maker by their likely role (or name if known)
- Reference the specific business and something unique about them
- Highlight 1-2 specific pain points you observed
- Present the solution (AI Agent or Website) concisely
- Include a clear but natural call-to-action
- Keep it under 200 words
- Tone: professional, warm, concise, credible
- Do NOT be salesy, pushy, or use clickbait
- Do NOT use generic phrases like "I hope this email finds you well"
- If a LIVE DEMO URL is provided, prominently include it in the email body — this is the most powerful hook
- Format: Subject line on first line, then blank line, then email body
- Sign off using the SENDER details provided below (name, company). Do NOT use placeholders like [Your Name] or [Your Company].`;

export async function generateOutreachMessage(
  lead: Lead,
  enrichment: Enrichment,
  solutionType: SolutionType,
  deliverableContent?: Record<string, unknown>,
  deployUrl?: string,
): Promise<{ subject: string; body: string }> {
  logger.info({ leadId: lead.id, solutionType }, 'Generating outreach message');

  // Fetch the user's profile for the email signature
  const sender = await prisma.user.findUnique({
    where: { id: lead.userId },
    select: { name: true, company: true },
  });

  const userPrompt = buildOutreachPrompt(lead, enrichment, solutionType, deliverableContent, deployUrl, sender);

  const raw = await generateText(OUTREACH_SYSTEM_PROMPT, userPrompt, {
    temperature: 0.8,
    maxTokens: 1500,
  });

  // Replace any remaining placeholder tokens with actual user profile data
  const senderName = sender?.name || 'The Team';
  const senderCompany = sender?.company || 'Our Team';
  const processed = raw
    .replace(/\[Your Name\]/gi, senderName)
    .replace(/\[Your Title\]/gi, 'Digital Solutions Specialist')
    .replace(/\[Your Company\]/gi, senderCompany);

  // Parse subject and body from the response
  const lines = processed.trim().split('\n');
  let subject = '';
  let body = '';

  // Find subject line (often prefixed with "Subject:" or is the first line)
  const subjectIdx = lines.findIndex((l) => l.toLowerCase().startsWith('subject:'));
  if (subjectIdx >= 0) {
    subject = lines[subjectIdx].replace(/^subject:\s*/i, '').trim();
    body = lines
      .slice(subjectIdx + 1)
      .join('\n')
      .trim();
  } else {
    subject = lines[0]?.trim() || `Quick question about ${lead.businessName}`;
    body = lines.slice(1).join('\n').trim();
  }

  const outreach = await prisma.outreachMessage.upsert({
    where: { leadId: lead.id },
    create: {
      leadId: lead.id,
      subject,
      body,
      toName: enrichment.decisionMakerRole || 'Business Owner',
      toEmail: lead.email || null,
    },
    update: {
      subject,
      body,
      toName: enrichment.decisionMakerRole || 'Business Owner',
      toEmail: lead.email || null,
    },
  });

  logger.info({ leadId: lead.id, outreachId: outreach.id }, 'Outreach message generated');
  return { subject, body };
}

function buildOutreachPrompt(
  lead: Lead,
  enrichment: Enrichment,
  solutionType: SolutionType,
  deliverableContent?: Record<string, unknown>,
  deployUrl?: string,
  sender?: { name: string | null; company: string | null } | null,
): string {
  const solutionName = solutionType === 'AI_AGENT' ? 'AI Agent / Chatbot' : 'Website Redesign / Improvement';

  let solutionHighlights = '';
  if (deliverableContent) {
    if (solutionType === 'AI_AGENT') {
      const dc = deliverableContent as Record<string, any>;
      solutionHighlights = `
Solution Highlights:
- Agent Name: ${dc.agentName || 'Custom AI Agent'}
- Type: ${dc.agentType || 'Business Assistant'}
- Key capabilities: ${(dc.capabilities || []).slice(0, 3).map((c: any) => c.name).join(', ')}
- ROI: ${dc.roi?.summary || 'Significant efficiency gains'}`;
    } else {
      const dc = deliverableContent as Record<string, any>;
      solutionHighlights = `
Solution Highlights:
- Current Site Score: ${dc.currentSiteAudit?.overallScore || 'N/A'}/100
- Key improvements: ${(dc.currentSiteAudit?.uxIssues || []).slice(0, 2).join(', ')}
- Expected impact: ${dc.roi?.summary || 'Significant traffic and conversion improvements'}`;
    }
  }

  return `Write a personalized outreach email for this business:

BUSINESS:
- Name: ${lead.businessName}
- Category: ${lead.category || 'Local Business'}
- Location: ${lead.address || 'Unknown'}
- Website: ${lead.website || 'No website'}
- Rating: ${lead.rating || 'N/A'}

ENRICHMENT:
- Summary: ${enrichment.businessSummary || 'N/A'}
- Pain Points: ${enrichment.painPoints.join('; ') || 'General digital presence gaps'}
- Digital Score: ${enrichment.digitalPresenceScore}/100
- Decision Maker: ${enrichment.decisionMakerRole || 'Owner'}
- Opportunities: ${enrichment.opportunities.join('; ') || 'N/A'}

SOLUTION TYPE: ${solutionName}
${solutionHighlights}
${deployUrl ? `\nLIVE DEMO URL: ${deployUrl}\n\nIMPORTANT: Include this live demo URL in the email. Phrase it as: "I've put together a working preview — you can see it live here: ${deployUrl}". This makes the email dramatically more compelling because the prospect can immediately see what was built for them.\n` : ''}
SENDER:
- Name: ${sender?.name || 'The Team'}
- Company: ${sender?.company || 'Our Team'}

Write the email now. Start with the Subject line. Sign off with the sender's real name and company — never use placeholders.`;
}
