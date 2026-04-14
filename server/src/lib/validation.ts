import { z } from 'zod';

export const LeadInputSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(500),
  category: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(2048).optional().nullable().or(z.literal('')),
  email: z.string().email().max(320).optional().nullable().or(z.literal('')),
  rating: z.number().min(0).max(5).optional().nullable(),
  socials: z.string().max(2000).optional().nullable(),
  hours: z.string().max(1000).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const BatchImportSchema = z.object({
  leads: z.array(LeadInputSchema).min(1).max(5000),
  solutionType: z.enum(['AI_AGENT', 'WEBSITE']),
  batchName: z.string().max(200).optional(),
});

export const StartProcessingSchema = z.object({
  solutionType: z.enum(['AI_AGENT', 'WEBSITE']),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'ENRICHING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  batchId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  category: z.string().max(200).optional(),
});

export type LeadInput = z.infer<typeof LeadInputSchema>;
export type BatchImportInput = z.infer<typeof BatchImportSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
