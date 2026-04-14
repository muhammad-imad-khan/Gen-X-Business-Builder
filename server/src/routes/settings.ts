import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

// ─── Supported providers and models ────────────────────────────
const AI_PROVIDERS: Record<string, { label: string; models: string[] }> = {
  azure: {
    label: 'Azure OpenAI',
    models: [
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'o3',
      'o3-mini',
      'o4-mini',
    ],
  },
  openai: {
    label: 'OpenAI',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'o3',
      'o3-mini',
      'o4-mini',
      'gpt-3.5-turbo',
    ],
  },
  anthropic: {
    label: 'Anthropic',
    models: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
    ],
  },
  google: {
    label: 'Google AI',
    models: [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
  },
  deepseek: {
    label: 'DeepSeek',
    models: [
      'deepseek-chat',
      'deepseek-reasoner',
    ],
  },
  xai: {
    label: 'xAI (Grok)',
    models: [
      'grok-3',
      'grok-3-mini',
      'grok-2',
    ],
  },
  mistral: {
    label: 'Mistral AI',
    models: [
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
      'codestral-latest',
    ],
  },
};

// ─── GET /api/settings ─────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let settings = await prisma.settings.findUnique({ where: { userId } });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { userId },
      });
    }

    // Never send raw API keys to the client – mask them
    res.json({
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel,
      aiApiKeySet: !!settings.aiApiKey,
      aiApiKeyMasked: settings.aiApiKey ? maskKey(settings.aiApiKey) : null,
      vercelConnected: settings.vercelConnected,
      vercelTeamId: settings.vercelTeamId,
      githubConnected: settings.githubConnected,
      githubUsername: settings.githubUsername,
      autoDeployToVercel: settings.autoDeployToVercel,
      providers: AI_PROVIDERS,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch settings');
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ─── PUT /api/settings/ai ──────────────────────────────────────
const aiSettingsSchema = z.object({
  aiProvider: z.enum(['azure', 'openai', 'anthropic', 'google', 'deepseek', 'xai', 'mistral']),
  aiModel: z.string().min(1),
  aiApiKey: z.string().min(1).optional(),
});

router.put('/ai', async (req: Request, res: Response) => {
  try {
    const data = aiSettingsSchema.parse(req.body);
    const userId = req.user!.userId;

    // Validate model belongs to chosen provider
    const provider = AI_PROVIDERS[data.aiProvider];
    if (!provider?.models.includes(data.aiModel)) {
      res.status(400).json({ error: `Model "${data.aiModel}" is not available for provider "${data.aiProvider}"` });
      return;
    }

    const updateData: any = {
      aiProvider: data.aiProvider,
      aiModel: data.aiModel,
    };
    if (data.aiApiKey) {
      updateData.aiApiKey = data.aiApiKey;
    }

    const settings = await prisma.settings.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    });

    res.json({
      aiProvider: settings.aiProvider,
      aiModel: settings.aiModel,
      aiApiKeySet: !!settings.aiApiKey,
      aiApiKeyMasked: settings.aiApiKey ? maskKey(settings.aiApiKey) : null,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to update AI settings');
    throw err;
  }
});

// ─── POST /api/settings/vercel/connect ─────────────────────────
const vercelConnectSchema = z.object({
  token: z.string().min(1, 'Vercel token is required'),
  teamId: z.string().optional(),
});

router.post('/vercel/connect', async (req: Request, res: Response) => {
  try {
    const { token, teamId } = vercelConnectSchema.parse(req.body);
    const userId = req.user!.userId;

    // Verify token by calling Vercel API
    const vercelRes = await fetch('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!vercelRes.ok) {
      res.status(401).json({ error: 'Invalid Vercel token. Please check and try again.' });
      return;
    }

    const vercelUser = (await vercelRes.json()) as { user: { username: string } };

    await prisma.settings.upsert({
      where: { userId },
      update: {
        vercelToken: token,
        vercelTeamId: teamId || null,
        vercelConnected: true,
      },
      create: {
        userId,
        vercelToken: token,
        vercelTeamId: teamId || null,
        vercelConnected: true,
      },
    });

    res.json({ connected: true, username: vercelUser.user.username });
  } catch (err) {
    logger.error({ err }, 'Vercel connect failed');
    throw err;
  }
});

// ─── POST /api/settings/vercel/disconnect ──────────────────────
router.post('/vercel/disconnect', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    await prisma.settings.upsert({
      where: { userId },
      update: { vercelToken: null, vercelTeamId: null, vercelConnected: false },
      create: { userId, vercelToken: null, vercelTeamId: null, vercelConnected: false },
    });
    res.json({ connected: false });
  } catch (err) {
    logger.error({ err }, 'Vercel disconnect failed');
    throw err;
  }
});

// ─── POST /api/settings/github/connect ─────────────────────────
const githubConnectSchema = z.object({
  token: z.string().min(1, 'GitHub token is required'),
});

router.post('/github/connect', async (req: Request, res: Response) => {
  try {
    const { token } = githubConnectSchema.parse(req.body);
    const userId = req.user!.userId;

    // Verify token by calling GitHub API
    const ghRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!ghRes.ok) {
      res.status(401).json({ error: 'Invalid GitHub token. Please check and try again.' });
      return;
    }

    const ghUser = (await ghRes.json()) as { login: string };

    await prisma.settings.upsert({
      where: { userId },
      update: {
        githubToken: token,
        githubUsername: ghUser.login,
        githubConnected: true,
      },
      create: {
        userId,
        githubToken: token,
        githubUsername: ghUser.login,
        githubConnected: true,
      },
    });

    res.json({ connected: true, username: ghUser.login });
  } catch (err) {
    logger.error({ err }, 'GitHub connect failed');
    throw err;
  }
});

// ─── POST /api/settings/github/disconnect ──────────────────────
router.post('/github/disconnect', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    await prisma.settings.upsert({
      where: { userId },
      update: { githubToken: null, githubUsername: null, githubConnected: false },
      create: { userId, githubToken: null, githubUsername: null, githubConnected: false },
    });
    res.json({ connected: false });
  } catch (err) {
    logger.error({ err }, 'GitHub disconnect failed');
    throw err;
  }
});

// ─── PUT /api/settings/deploy-toggle ───────────────────────────
const deployToggleSchema = z.object({
  autoDeployToVercel: z.boolean(),
});

router.put('/deploy-toggle', async (req: Request, res: Response) => {
  try {
    const { autoDeployToVercel } = deployToggleSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check we have integrations before enabling
    if (autoDeployToVercel) {
      const settings = await prisma.settings.findUnique({ where: { userId } });
      if (!settings?.vercelConnected) {
        res.status(400).json({ error: 'Connect Vercel before enabling auto-deploy.' });
        return;
      }
      if (!settings?.githubConnected) {
        res.status(400).json({ error: 'Connect GitHub before enabling auto-deploy.' });
        return;
      }
    }

    await prisma.settings.upsert({
      where: { userId },
      update: { autoDeployToVercel },
      create: { userId, autoDeployToVercel },
    });

    res.json({ autoDeployToVercel });
  } catch (err) {
    logger.error({ err }, 'Deploy toggle update failed');
    throw err;
  }
});

// ─── Utility ───────────────────────────────────────────────────
function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

export default router;
