import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { requireAuth } from '../lib/auth';
import { sendProReceiptEmail } from '../lib/email';

const router = Router();

// ─── GET /billing/config ───────────────────────────────────────
// Returns the Paddle client token + price ID for frontend checkout
router.get('/config', requireAuth, (_req: Request, res: Response) => {
  res.json({
    clientToken: config.paddle.clientToken,
    proPriceId: config.paddle.proPriceId,
    environment: config.paddle.environment,
  });
});

// ─── GET /billing/subscription ─────────────────────────────────
// Returns current subscription status
router.get('/subscription', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      subscriptionStatus: true,
      paddleSubscriptionId: true,
      currentPeriodEnd: true,
    },
  });
  res.json({
    plan: user?.plan || 'free',
    subscriptionStatus: user?.subscriptionStatus || null,
    subscriptionId: user?.paddleSubscriptionId || null,
    currentPeriodEnd: user?.currentPeriodEnd || null,
  });
});

// ─── POST /billing/activate-pro ────────────────────────────────
// Direct Pro activation — sets plan to pro with 30-day validity & sends receipt
router.post('/activate-pro', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.plan === 'pro' && user.currentPeriodEnd && user.currentPeriodEnd > new Date()) {
    res.status(400).json({ error: 'Pro plan is already active', currentPeriodEnd: user.currentPeriodEnd });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: 'pro',
      subscriptionStatus: 'active',
      currentPeriodEnd: expiresAt,
    },
  });

  // Send receipt email
  try {
    await sendProReceiptEmail(user.email, {
      name: user.name || undefined,
      activatedAt: now,
      expiresAt,
    });
  } catch (err) {
    logger.error({ err, userId }, 'Failed to send Pro receipt email');
  }

  logger.info({ userId, expiresAt }, 'Pro plan activated (30 days)');

  res.json({
    plan: 'pro',
    subscriptionStatus: 'active',
    currentPeriodEnd: expiresAt,
    message: 'Pro plan activated for 30 days. Receipt sent to your email.',
  });
});

// ─── POST /billing/webhook ─────────────────────────────────────
// Paddle webhook handler — verifies signature, processes events
router.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['paddle-signature'] as string;
  if (!signature) {
    res.status(400).json({ error: 'Missing Paddle-Signature header' });
    return;
  }

  // Verify webhook signature
  const rawBody = JSON.stringify(req.body);
  const isValid = verifyPaddleWebhook(signature, rawBody, config.paddle.webhookSecret);
  if (!isValid) {
    logger.warn('Invalid Paddle webhook signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const event = req.body;
  const eventType = event.event_type;
  logger.info({ eventType, eventId: event.event_id }, 'Paddle webhook received');

  try {
    switch (eventType) {
      case 'subscription.created':
      case 'subscription.activated':
        await handleSubscriptionActivated(event.data);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;
      case 'subscription.paused':
        await handleSubscriptionPaused(event.data);
        break;
      case 'subscription.resumed':
        await handleSubscriptionActivated(event.data);
        break;
      case 'subscription.past_due':
        await handleSubscriptionPastDue(event.data);
        break;
      case 'transaction.completed':
        // Initial transaction completed — subscription events handle plan changes
        logger.info({ transactionId: event.data.id }, 'Transaction completed');
        break;
      default:
        logger.info({ eventType }, 'Unhandled Paddle event');
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err, eventType }, 'Error processing Paddle webhook');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ─── Webhook Handlers ──────────────────────────────────────────

async function handleSubscriptionActivated(data: any) {
  const customerId = data.customer_id;
  const subscriptionId = data.id;
  const status = data.status; // active
  const priceId = data.items?.[0]?.price?.id;
  const currentPeriodEnd = data.current_billing_period?.ends_at;

  // Find user by paddle_customer_id or by custom_data.user_id
  const userId = data.custom_data?.user_id;
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findUnique({ where: { paddleCustomerId: customerId } });

  if (!user) {
    logger.warn({ customerId, userId }, 'No user found for subscription activation');
    return;
  }

  // Determine plan from price ID
  const plan = priceId === config.paddle.proPriceId ? 'pro' : 'free';

  // Use Paddle's period end if available, otherwise set 30 days from now
  const now = new Date();
  const expiresAt = currentPeriodEnd
    ? new Date(currentPeriodEnd)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan,
      paddleCustomerId: customerId,
      paddleSubscriptionId: subscriptionId,
      subscriptionStatus: status,
      subscriptionPlanId: priceId,
      currentPeriodEnd: expiresAt,
    },
  });

  // Send receipt email for Pro activation
  if (plan === 'pro') {
    try {
      await sendProReceiptEmail(user.email, {
        name: user.name || undefined,
        activatedAt: now,
        expiresAt,
      });
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Failed to send Pro receipt email');
    }
  }

  logger.info({ userId: user.id, plan, subscriptionId, expiresAt }, 'Subscription activated');
}

async function handleSubscriptionUpdated(data: any) {
  const subscriptionId = data.id;
  const status = data.status;
  const priceId = data.items?.[0]?.price?.id;
  const currentPeriodEnd = data.current_billing_period?.ends_at;

  const user = await prisma.user.findUnique({ where: { paddleSubscriptionId: subscriptionId } });
  if (!user) {
    logger.warn({ subscriptionId }, 'No user found for subscription update');
    return;
  }

  const plan = priceId === config.paddle.proPriceId ? 'pro' : 'free';

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: status === 'active' ? plan : user.plan,
      subscriptionStatus: status,
      subscriptionPlanId: priceId,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
    },
  });

  logger.info({ userId: user.id, plan, status }, 'Subscription updated');
}

async function handleSubscriptionCanceled(data: any) {
  const subscriptionId = data.id;

  const user = await prisma.user.findUnique({ where: { paddleSubscriptionId: subscriptionId } });
  if (!user) return;

  // Keep pro access until period ends, but mark as canceled
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'canceled',
      // Plan stays 'pro' until currentPeriodEnd; a cron or next webhook can downgrade
    },
  });

  logger.info({ userId: user.id, subscriptionId }, 'Subscription canceled');
}

async function handleSubscriptionPaused(data: any) {
  const subscriptionId = data.id;

  const user = await prisma.user.findUnique({ where: { paddleSubscriptionId: subscriptionId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: 'free',
      subscriptionStatus: 'paused',
    },
  });

  logger.info({ userId: user.id }, 'Subscription paused — downgraded to free');
}

async function handleSubscriptionPastDue(data: any) {
  const subscriptionId = data.id;

  const user = await prisma.user.findUnique({ where: { paddleSubscriptionId: subscriptionId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: 'past_due' },
  });

  logger.info({ userId: user.id }, 'Subscription past due');
}

// ─── Signature Verification ────────────────────────────────────

function verifyPaddleWebhook(signature: string, rawBody: string, secret: string): boolean {
  try {
    // Paddle signature format: ts=TIMESTAMP;h1=HASH
    const parts = signature.split(';');
    const tsStr = parts.find(p => p.startsWith('ts='))?.replace('ts=', '');
    const h1 = parts.find(p => p.startsWith('h1='))?.replace('h1=', '');

    if (!tsStr || !h1) return false;

    const payload = `${tsStr}:${rawBody}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected));
  } catch {
    return false;
  }
}

export default router;
