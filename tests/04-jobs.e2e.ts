import { describe, it, expect } from 'vitest';
import { apiRequest } from './helpers';

describe('Jobs', () => {
  it('GET /api/jobs returns job list', async () => {
    const { status, data } = await apiRequest('/api/jobs');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/jobs supports leadId filter', async () => {
    // Get a lead first
    const { data: leadsData } = await apiRequest('/api/leads?limit=1');
    if (leadsData.leads.length === 0) return;

    const leadId = leadsData.leads[0].id;
    const { status, data } = await apiRequest(`/api/jobs?leadId=${leadId}`);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    for (const job of data) {
      expect(job.leadId).toBe(leadId);
    }
  });

  it('GET /api/jobs/:id returns 404 for invalid job', async () => {
    const { status } = await apiRequest('/api/jobs/00000000-0000-0000-0000-000000000000');
    expect(status).toBe(404);
  });
});
