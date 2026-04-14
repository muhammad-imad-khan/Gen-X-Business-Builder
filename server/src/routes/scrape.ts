import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scrapeBusinesses } from '../services/scraper';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Detects the best-matching category from the user's search query
 * by comparing against all category names in the DB.
 */
async function detectCategory(query: string, userId: string): Promise<{ name: string; color: string } | null> {
  const categories = await prisma.category.findMany({ where: { userId } });
  if (categories.length === 0) return null;

  const q = query.toLowerCase();

  // Build keyword map: category name + common aliases → category
  const aliasMap: Record<string, typeof categories[0]> = {};
  const aliases: Record<string, string[]> = {
    'dentist': ['dental', 'dentistry', 'orthodontist', 'oral'],
    'restaurant': ['restaurants', 'food', 'dining', 'eatery', 'cafe', 'bistro', 'pizza', 'sushi', 'burger'],
    'salon & spa': ['salon', 'spa', 'barber', 'barbershop', 'hair', 'beauty', 'nail'],
    'gym & fitness': ['gym', 'fitness', 'crossfit', 'yoga', 'pilates', 'workout', 'training'],
    'real estate': ['realtor', 'realty', 'property', 'properties', 'homes', 'real estate agent'],
    'plumber': ['plumbing', 'plumbers'],
    'electrician': ['electrical', 'electricians', 'electric'],
    'lawyer': ['attorney', 'law firm', 'legal', 'lawyers', 'attorneys'],
    'accountant': ['accounting', 'cpa', 'bookkeeper', 'tax', 'accountants'],
    'auto repair': ['auto', 'mechanic', 'car repair', 'garage', 'auto body', 'car wash'],
    'cleaning service': ['cleaning', 'maid', 'janitorial', 'house cleaning', 'cleaner'],
    'doctor & clinic': ['doctor', 'clinic', 'medical', 'physician', 'hospital', 'healthcare', 'urgent care'],
    'veterinarian': ['vet', 'veterinary', 'animal hospital', 'pet clinic', 'animal clinic'],
    'hotel & lodging': ['hotel', 'motel', 'inn', 'lodging', 'resort', 'bed and breakfast', 'airbnb'],
    'photography': ['photographer', 'photo studio', 'photography studio', 'photos'],
    'landscaping': ['landscaper', 'lawn', 'garden', 'tree service', 'yard'],
    'roofing': ['roofer', 'roof', 'roofing contractor'],
    'hvac': ['heating', 'cooling', 'air conditioning', 'furnace'],
    'insurance': ['insurance agent', 'insurer', 'insurance agency'],
    'marketing agency': ['marketing', 'seo', 'digital marketing', 'advertising', 'ad agency', 'web design'],
  };

  for (const cat of categories) {
    const key = cat.name.toLowerCase();
    aliasMap[key] = cat;
    const extra = aliases[key] || [];
    for (const alias of extra) {
      aliasMap[alias] = cat;
    }
  }

  // Score: find the longest matching keyword in the query
  let bestMatch: typeof categories[0] | null = null;
  let bestLen = 0;

  for (const [keyword, cat] of Object.entries(aliasMap)) {
    if (q.includes(keyword) && keyword.length > bestLen) {
      bestMatch = cat;
      bestLen = keyword.length;
    }
  }

  return bestMatch ? { name: bestMatch.name, color: bestMatch.color } : null;
}

// ─── POST /api/scrape ──────────────────────────────────────────
const scrapeSchema = z.object({
  query: z.string().min(2, 'Search query is required').max(200),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { query, limit } = scrapeSchema.parse(req.body);
    const userId = req.user!.userId;

    // Auto-detect category from search query
    const detectedCategory = await detectCategory(query, userId);
    logger.info({ query, limit, detectedCategory: detectedCategory?.name || null }, 'Starting scrape');

    const businesses = await scrapeBusinesses({ query, limit });

    // Override each business's category with the detected one
    if (detectedCategory) {
      for (const biz of businesses) {
        biz.category = detectedCategory.name;
      }
    }

    if (businesses.length === 0) {
      res.json({
        businesses: [],
        count: 0,
        detectedCategory: detectedCategory || null,
        message: 'No businesses found. Try a more specific query like "dentists in Chicago".',
      });
      return;
    }

    res.json({
      businesses,
      count: businesses.length,
      detectedCategory: detectedCategory || null,
      message: `Found ${businesses.length} businesses.`,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/scrape/import ───────────────────────────────────
// Takes scraped results + solution choice, creates a batch + leads
const scrapeImportSchema = z.object({
  query: z.string().min(1),
  solutionType: z.enum(['AI_AGENT', 'WEBSITE']),
  batchName: z.string().optional(),
  businesses: z.array(
    z.object({
      businessName: z.string().min(1),
      category: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      rating: z.number().nullable().optional(),
      socials: z.string().nullable().optional(),
      hours: z.string().nullable().optional(),
    })
  ).min(1, 'At least one business is required'),
});

router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = scrapeImportSchema.parse(req.body);
    const userId = req.user!.userId;
    const batchId = uuidv4();

    // Create batch
    await prisma.batch.create({
      data: {
        id: batchId,
        userId,
        name: input.batchName || `Scrape: ${input.query}`,
        solutionType: input.solutionType,
        totalLeads: input.businesses.length,
        status: 'PENDING',
      },
    });

    // Bulk create leads
    const leads = await prisma.$transaction(
      input.businesses.map((b) =>
        prisma.lead.create({
          data: {
            batchId,
            userId,
            businessName: b.businessName,
            category: b.category || null,
            address: b.address || null,
            phone: b.phone || null,
            website: b.website || null,
            email: b.email || null,
            rating: b.rating || null,
            socials: b.socials || null,
            hours: b.hours || null,
            solutionType: input.solutionType,
            status: 'PENDING',
          },
        })
      )
    );

    logger.info({ batchId, query: input.query, count: leads.length }, 'Scraped leads imported');

    res.status(201).json({
      batchId,
      leadsCreated: leads.length,
      solutionType: input.solutionType,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
