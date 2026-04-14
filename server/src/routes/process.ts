import { Router, Request, Response, NextFunction } from 'express';
import { processLead, processNextLead } from '../services/processor';
import { logger } from '../lib/logger';

const router = Router();

// ─── Process a Specific Lead ───────────────────────────────────
router.post('/lead/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await processLead(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Process Next Pending Lead (polling endpoint) ──────────────
router.post('/next', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.body || {};
    const result = await processNextLead(batchId);

    if (!result.processed) {
      res.json({ status: 'idle', message: 'No pending leads', remaining: result.remaining });
      return;
    }

    res.json({
      status: 'processed',
      leadId: result.leadId,
      remaining: result.remaining,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
