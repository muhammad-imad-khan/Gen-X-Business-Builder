import OpenAI, { AzureOpenAI } from 'openai';
import { config } from '../config';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Resolves the OpenAI-compatible client using user settings from DB,
 * falling back to env vars if no settings are saved.
 * Supports Azure OpenAI as default when AZURE_OPENAI_RESOURCE is set.
 */
async function getClient(): Promise<{ client: OpenAI; model: string }> {
  const settings = await prisma.settings.findFirst().catch(() => null);

  // If user has their own API key saved, use their provider choice.
  // Otherwise fall back to env vars — preferring Azure when configured.
  const hasUserKey = !!settings?.aiApiKey;
  const azureAvailable = !!config.azure.resource && !!config.azure.apiKey;

  let provider: string;
  let apiKey: string;
  let model: string;

  if (hasUserKey) {
    // User has set their own key in Settings
    provider = settings!.aiProvider;
    apiKey = settings!.aiApiKey!;
    model = settings!.aiModel;
  } else if (azureAvailable) {
    // Fall back to Azure env vars
    provider = 'azure';
    apiKey = config.azure.apiKey;
    model = config.azure.deployment;
  } else if (config.openai.apiKey) {
    // Fall back to OpenAI env vars
    provider = 'openai';
    apiKey = config.openai.apiKey;
    model = config.openai.model;
  } else {
    throw new Error('No AI API key configured. Go to Settings to add one.');
  }

  // Azure OpenAI
  if (provider === 'azure') {
    const resource = config.azure.resource;
    const deployment = settings?.aiModel || config.azure.deployment;
    if (!resource) throw new Error('AZURE_OPENAI_RESOURCE not configured.');

    const client = new AzureOpenAI({
      apiKey,
      endpoint: `https://${resource}.openai.azure.com`,
      deployment,
      apiVersion: config.azure.apiVersion,
    });

    return { client: client as unknown as OpenAI, model: deployment };
  }

  // Standard OpenAI-compatible providers
  const baseURLs: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google: 'https://generativelanguage.googleapis.com/v1beta/openai',
    deepseek: 'https://api.deepseek.com/v1',
    xai: 'https://api.x.ai/v1',
    mistral: 'https://api.mistral.ai/v1',
  };

  const client = new OpenAI({
    apiKey,
    baseURL: baseURLs[provider] || baseURLs.openai,
  });

  return { client, model };
}

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 4000 } = options;

  try {
    const { client, model } = await getClient();

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });

    return response.choices[0]?.message?.content || '{}';
  } catch (err) {
    logger.error({ err }, 'LLM generation failed');
    throw err;
  }
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 4000 } = options;

  try {
    const { client, model } = await getClient();

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  } catch (err) {
    logger.error({ err }, 'LLM text generation failed');
    throw err;
  }
}
