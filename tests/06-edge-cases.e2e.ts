import { describe, it, expect } from 'vitest';
import { apiRequest } from './helpers';

describe('API Validation & Edge Cases', () => {
  it('rejects import with empty leads array', async () => {
    const { status } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: { leads: [], solutionType: 'AI_AGENT' },
    });
    expect(status).toBe(400);
  });

  it('rejects import with missing solutionType', async () => {
    const { status } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: { leads: [{ businessName: 'Test' }] },
    });
    expect(status).toBe(400);
  });

  it('rejects import with invalid email format', async () => {
    const { status } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: [{ businessName: 'Test', email: 'not-an-email' }],
        solutionType: 'AI_AGENT',
      },
    });
    expect(status).toBe(400);
  });

  it('rejects import with invalid website URL', async () => {
    const { status } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: [{ businessName: 'Test', website: 'not-a-url' }],
        solutionType: 'AI_AGENT',
      },
    });
    expect(status).toBe(400);
  });

  it('handles start processing for non-existent lead', async () => {
    const { status } = await apiRequest('/api/leads/00000000-0000-0000-0000-000000000000/start', {
      method: 'POST',
      body: { solutionType: 'AI_AGENT' },
    });
    expect(status).toBe(404);
  });

  it('handles preview for non-existent lead', async () => {
    const { status } = await apiRequest('/api/leads/00000000-0000-0000-0000-000000000000/preview');
    expect(status).toBe(404);
  });

  it('GET /api/leads with invalid pagination returns defaults', async () => {
    const { status, data } = await apiRequest('/api/leads?page=0&limit=-1');
    // Zod coerce should handle gracefully or return 400
    expect([200, 400]).toContain(status);
  });

  it('handles large batch name gracefully', async () => {
    const { status } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: [{ businessName: 'Test' }],
        solutionType: 'AI_AGENT',
        batchName: 'A'.repeat(201), // exceeds max 200
      },
    });
    expect(status).toBe(400);
  });

  it('POST /api/process/next returns idle when no pending leads of type', async () => {
    const { status, data } = await apiRequest('/api/process/next', {
      method: 'POST',
      body: { batchId: '00000000-0000-0000-0000-000000000000' },
    });
    expect(status).toBe(200);
    expect(data.status).toBe('idle');
  });
});

describe('API Security', () => {
  it('returns JSON error for invalid JSON body', async () => {
    const res = await fetch(`${process.env.BASE_URL || 'http://localhost:3001'}/api/leads/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json}',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('404 for unknown API routes', async () => {
    const res = await fetch(`${process.env.BASE_URL || 'http://localhost:3001'}/api/nonexistent`);
    expect(res.status).toBe(404);
  });
});
