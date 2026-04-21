import { prisma } from '../lib/prisma';
import { generateCompletion } from './llm';
import { logger } from '../lib/logger';

const REVISION_SYSTEM_PROMPT = `You are a skilled AI solutions architect and web strategist working iteratively with a client.

You are revising a previously generated solution based on the client's feedback. You have access to:
1. The business profile and enrichment data
2. The current version of the solution
3. The chat history of prior revision requests
4. The client's latest revision request

Your task:
- Apply the requested changes to the existing solution
- Keep everything else unchanged unless the revision naturally requires it
- Return the COMPLETE updated solution in the same JSON structure as the original
- Be responsive and specific — address exactly what the client asked for
- If the client asks something unclear, still make your best interpretation and apply it

IMPORTANT: Return ONLY valid JSON matching the exact same schema as the original solution. Do not add commentary outside the JSON.`;

interface RevisionInput {
  leadId: string;
  message: string;
  target: 'AI_AGENT_SPEC' | 'WEBSITE_PROPOSAL' | 'OUTREACH';
}

export async function processRevision(input: RevisionInput): Promise<{
  reply: string;
  updatedContent: Record<string, unknown> | null;
}> {
  const { leadId, message, target } = input;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { enrichment: true },
  });
  if (!lead) throw new Error('Lead not found');

  // Get the current deliverable
  const deliverable = await prisma.deliverable.findFirst({
    where: { leadId, type: target },
    orderBy: { createdAt: 'desc' },
  });

  if (!deliverable) throw new Error('No deliverable found to revise');

  // Get chat history for context
  const history = await prisma.revisionMessage.findMany({
    where: { leadId, target },
    orderBy: { createdAt: 'asc' },
    take: 20, // keep context window reasonable
  });

  // Store user message
  await prisma.revisionMessage.create({
    data: { leadId, role: 'user', content: message, target },
  });

  // Build the revision prompt
  const userPrompt = buildRevisionPrompt(lead, lead.enrichment, deliverable.content as Record<string, unknown>, history, message, target);

  logger.info({ leadId, target, messageLength: message.length }, 'Processing revision request');

  const raw = await generateCompletion(REVISION_SYSTEM_PROMPT, userPrompt, {
    temperature: 0.6,
    maxTokens: 5000,
  });

  let updatedContent: Record<string, unknown>;
  try {
    updatedContent = JSON.parse(raw);
  } catch {
    // If LLM returns non-JSON, treat it as a conversational reply
    const reply = raw.slice(0, 1000);
    await prisma.revisionMessage.create({
      data: { leadId, role: 'assistant', content: reply, target },
    });
    return { reply, updatedContent: null };
  }

  // Update the deliverable with revised content
  await prisma.deliverable.update({
    where: { id: deliverable.id },
    data: {
      content: updatedContent,
      summary: extractSummary(updatedContent, target),
      title: extractTitle(updatedContent, target, lead.businessName),
    },
  });

  // Generate assistant reply summarizing changes
  const reply = generateChangesSummary(deliverable.content as Record<string, unknown>, updatedContent, message);

  await prisma.revisionMessage.create({
    data: { leadId, role: 'assistant', content: reply, target },
  });

  logger.info({ leadId, target, deliverableId: deliverable.id }, 'Revision applied');

  return { reply, updatedContent };
}

function buildRevisionPrompt(
  lead: any,
  enrichment: any,
  currentContent: Record<string, unknown>,
  history: { role: string; content: string }[],
  userMessage: string,
  target: string,
): string {
  const parts: string[] = [];

  parts.push(`BUSINESS CONTEXT:`);
  parts.push(`- Name: ${lead.businessName}`);
  parts.push(`- Category: ${lead.category || 'Unknown'}`);
  parts.push(`- Location: ${lead.address || 'Unknown'}`);
  parts.push(`- Website: ${lead.website || 'None'}`);
  parts.push(`- Rating: ${lead.rating || 'N/A'}`);

  if (enrichment) {
    parts.push(`\nENRICHMENT:`);
    parts.push(`- Summary: ${enrichment.businessSummary || 'N/A'}`);
    parts.push(`- Services: ${enrichment.services?.join(', ') || 'Unknown'}`);
    parts.push(`- Pain Points: ${enrichment.painPoints?.join(', ') || 'None'}`);
    parts.push(`- Target Audience: ${enrichment.targetAudience || 'Unknown'}`);
  }

  parts.push(`\nSOLUTION TYPE: ${target}`);
  parts.push(`\nCURRENT SOLUTION (to be revised):`);
  parts.push(JSON.stringify(currentContent, null, 2));

  if (history.length > 0) {
    parts.push(`\nPRIOR REVISION HISTORY:`);
    for (const msg of history) {
      parts.push(`[${msg.role.toUpperCase()}]: ${msg.content}`);
    }
  }

  parts.push(`\nLATEST REVISION REQUEST:`);
  parts.push(userMessage);
  parts.push(`\nApply the requested changes and return the complete updated JSON solution.`);

  return parts.join('\n');
}

function extractSummary(content: Record<string, unknown>, target: string): string | null {
  if (target === 'AI_AGENT_SPEC') {
    return (content.overview as string)?.slice(0, 500) || null;
  }
  if (target === 'WEBSITE_PROPOSAL') {
    return (content.executiveSummary as string)?.slice(0, 500) || null;
  }
  return null;
}

function extractTitle(content: Record<string, unknown>, target: string, businessName: string): string {
  if (target === 'AI_AGENT_SPEC') {
    return `${content.agentName || 'AI Agent'} - ${businessName}`;
  }
  if (target === 'WEBSITE_PROPOSAL') {
    return (content.proposalTitle as string) || `Website Proposal - ${businessName}`;
  }
  return businessName;
}

function generateChangesSummary(
  oldContent: Record<string, unknown>,
  newContent: Record<string, unknown>,
  userRequest: string,
): string {
  // Simple summary — the LLM already applied changes, just confirm
  const changedKeys = Object.keys(newContent).filter(
    (key) => JSON.stringify(oldContent[key]) !== JSON.stringify(newContent[key]),
  );

  if (changedKeys.length === 0) {
    return `I reviewed your request but the solution already aligned with what you asked. No changes were needed.`;
  }

  const sections = changedKeys.slice(0, 5).join(', ');
  return `Done! I've updated the following sections based on your request: ${sections}. Refresh the solution tab to see the changes.`;
}

export async function getChatHistory(leadId: string, target?: string) {
  const where: any = { leadId };
  if (target) where.target = target;

  return prisma.revisionMessage.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      content: true,
      target: true,
      createdAt: true,
    },
  });
}
