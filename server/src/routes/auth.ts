import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { signToken, requireAuth } from '../lib/auth';
import { getPlanUsage } from '../lib/plan-limits';

const router = Router();

// Default categories to seed for new users
const DEFAULT_CATEGORIES = [
  { name: 'Restaurant', color: '#ef4444' },
  { name: 'Dentist', color: '#3b82f6' },
  { name: 'Plumber', color: '#6366f1' },
  { name: 'Electrician', color: '#f59e0b' },
  { name: 'Real Estate', color: '#10b981' },
  { name: 'Gym', color: '#8b5cf6' },
  { name: 'Salon', color: '#ec4899' },
  { name: 'Auto Repair', color: '#64748b' },
  { name: 'Lawyer', color: '#0ea5e9' },
  { name: 'Accounting', color: '#14b8a6' },
  { name: 'Hotel', color: '#a855f7' },
  { name: 'Spa', color: '#f472b6' },
  { name: 'Bakery', color: '#fb923c' },
  { name: 'Clinic', color: '#22d3ee' },
  { name: 'Photography', color: '#e879f9' },
  { name: 'Construction', color: '#78716c' },
  { name: 'Insurance', color: '#84cc16' },
  { name: 'Pet Store', color: '#c084fc' },
  { name: 'Education', color: '#2dd4bf' },
  { name: 'Marketing Agency', color: '#f43f5e' },
];

// ─── POST /api/auth/register ───────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        company: data.company || null,
      },
    });

    // Seed default categories for the new user
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
    });

    // Create default settings for the user
    await prisma.settings.create({
      data: { userId: user.id },
    });

    const token = signToken({ userId: user.id, email: user.email });

    logger.info({ userId: user.id, email: user.email }, 'User registered');
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        plan: user.plan,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    logger.error({ err }, 'Registration failed');
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });

    logger.info({ userId: user.id }, 'User logged in');
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        plan: user.plan,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    logger.error({ err }, 'Login failed');
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, company: true, plan: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch user');
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── GET /api/auth/me/usage ────────────────────────────────────
router.get('/me/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    const usage = await getPlanUsage(req.user!.userId);
    res.json(usage);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch plan usage');
    res.status(500).json({ error: 'Failed to fetch plan usage' });
  }
});

export default router;
