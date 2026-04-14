import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

// ─── GET /api/categories ───────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/categories ──────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color').optional(),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, color } = createSchema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await prisma.category.findFirst({ where: { userId, name } });
    if (existing) {
      res.status(409).json({ error: `Category "${name}" already exists.` });
      return;
    }

    const category = await prisma.category.create({
      data: { userId, name, ...(color ? { color } : {}) },
    });

    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/categories/:id ───────────────────────────────────
const updateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, color } = updateSchema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await prisma.category.findFirst({ where: { id: req.params.id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    if (name && name !== existing.name) {
      const dup = await prisma.category.findFirst({ where: { userId, name } });
      if (dup) {
        res.status(409).json({ error: `Category "${name}" already exists.` });
        return;
      }
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { ...(name ? { name } : {}), ...(color ? { color } : {}) },
    });

    res.json(category);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/categories/:id ────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.category.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }

    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
