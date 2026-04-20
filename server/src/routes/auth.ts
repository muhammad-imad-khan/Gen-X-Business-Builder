import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { signToken, requireAuth } from '../lib/auth';
import { getPlanUsage } from '../lib/plan-limits';
import { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail } from '../lib/email';

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
        emailVerified: false,
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

    // Generate and send verification code
    const code = generateVerificationCode();
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    await sendVerificationEmail(user.email, code, user.name || undefined);

    logger.info({ userId: user.id, email: user.email }, 'User registered – verification email sent');
    res.status(201).json({
      message: 'Account created. Please check your email for a verification code.',
      email: user.email,
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

    if (!user.emailVerified) {
      res.status(403).json({ error: 'Email not verified. Please verify your email first.', needsVerification: true, email: user.email });
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
      select: { id: true, email: true, name: true, company: true, plan: true, avatarUrl: true, createdAt: true },
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

// ─── PUT /api/auth/me (update profile) ────────────────────────
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  company: z.string().max(100).optional().nullable(),
});

router.put('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: { id: true, email: true, name: true, company: true, plan: true, avatarUrl: true, createdAt: true },
    });
    res.json({ user });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    logger.error({ err }, 'Failed to update profile');
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── PUT /api/auth/me/password ────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

router.put('/me/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const valid = await bcrypt.compare(data.currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }
    const hashedPassword = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    logger.error({ err }, 'Failed to change password');
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ─── PUT /api/auth/me/avatar ──────────────────────────────────
router.put('/me/avatar', requireAuth, async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl || typeof avatarUrl !== 'string') {
      res.status(400).json({ error: 'Avatar URL is required' });
      return;
    }
    // Only allow data URIs (base64) or https URLs
    if (!avatarUrl.startsWith('data:image/') && !avatarUrl.startsWith('https://')) {
      res.status(400).json({ error: 'Invalid avatar format' });
      return;
    }
    // Limit base64 size to 500KB
    if (avatarUrl.startsWith('data:image/') && avatarUrl.length > 500000) {
      res.status(400).json({ error: 'Image too large. Max 500KB.' });
      return;
    }
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatarUrl },
      select: { id: true, email: true, name: true, company: true, plan: true, avatarUrl: true, createdAt: true },
    });
    res.json({ user });
  } catch (err) {
    logger.error({ err }, 'Failed to update avatar');
    res.status(500).json({ error: 'Failed to update avatar' });
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

// ─── GET /api/auth/verify-email (link-based) ──────────────────
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const code = req.query.code as string;

    if (!email || !code || code.length !== 6) {
      res.status(400).json({ error: 'Invalid verification link' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    if (user.emailVerified) {
      res.json({ message: 'Email already verified', alreadyVerified: true });
      return;
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code,
        type: 'EMAIL_VERIFICATION',
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      res.status(400).json({ error: 'Invalid or expired verification link' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
      prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    logger.info({ userId: user.id }, 'Email verified via link');
    res.json({ message: 'Email verified successfully. You can now sign in.', verified: true });
  } catch (err) {
    logger.error({ err }, 'Link-based email verification failed');
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── POST /api/auth/verify-email ───────────────────────────────
const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const data = verifyEmailSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    if (user.emailVerified) {
      res.json({ message: 'Email already verified' });
      return;
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: data.code,
        type: 'EMAIL_VERIFICATION',
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      res.status(400).json({ error: 'Invalid or expired verification code' });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
      prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    logger.info({ userId: user.id }, 'Email verified');
    res.json({ message: 'Email verified successfully. You can now sign in.' });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    logger.error({ err }, 'Email verification failed');
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ─── POST /api/auth/resend-code ────────────────────────────────
const resendCodeSchema = z.object({
  email: z.string().email(),
  type: z.enum(['EMAIL_VERIFICATION', 'PASSWORD_RESET']).default('EMAIL_VERIFICATION'),
});

router.post('/resend-code', async (req: Request, res: Response) => {
  try {
    const data = resendCodeSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      // Don't reveal whether email exists
      res.json({ message: 'If an account exists, a new code has been sent.' });
      return;
    }

    // Invalidate old codes of this type
    await prisma.verificationCode.updateMany({
      where: { userId: user.id, type: data.type, used: false },
      data: { used: true },
    });

    const code = generateVerificationCode();
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code,
        type: data.type,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    if (data.type === 'EMAIL_VERIFICATION') {
      await sendVerificationEmail(user.email, code, user.name || undefined);
    } else {
      await sendPasswordResetEmail(user.email, code, user.name || undefined);
    }

    logger.info({ userId: user.id, type: data.type }, 'Verification code resent');
    res.json({ message: 'If an account exists, a new code has been sent.' });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    logger.error({ err }, 'Resend code failed');
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// ─── POST /api/auth/forgot-password ────────────────────────────
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      // Don't reveal whether email exists
      res.json({ message: 'If an account exists, a reset code has been sent.' });
      return;
    }

    // Invalidate old reset codes
    await prisma.verificationCode.updateMany({
      where: { userId: user.id, type: 'PASSWORD_RESET', used: false },
      data: { used: true },
    });

    const code = generateVerificationCode();
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendPasswordResetEmail(user.email, code, user.name || undefined);

    logger.info({ email: data.email }, 'Password reset code sent');
    res.json({ message: 'If an account exists, a reset code has been sent.', email: data.email });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    logger.error({ err }, 'Forgot password failed');
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ─── POST /api/auth/reset-password ─────────────────────────────
const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const record = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: data.code,
        type: 'PASSWORD_RESET',
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      res.status(400).json({ error: 'Invalid or expired reset code' });
      return;
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } }),
      prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } }),
    ]);

    logger.info({ userId: user.id }, 'Password reset');
    res.json({ message: 'Password has been reset successfully. You can now sign in.' });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    logger.error({ err }, 'Password reset failed');
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
