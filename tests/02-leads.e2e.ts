import { describe, it, expect } from 'vitest';
import { apiRequest, sampleLeads } from './helpers';

let batchId: string;
let leadIds: string[] = [];

describe('Lead Import', () => {
  it('POST /api/leads/import creates a batch with AI_AGENT solution', async () => {
    const { status, data } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: sampleLeads,
        solutionType: 'AI_AGENT',
        batchName: 'E2E Test Batch - AI Agent',
      },
    });

    expect(status).toBe(201);
    expect(data.batchId).toBeDefined();
    expect(data.leadsCreated).toBe(sampleLeads.length);
    expect(data.solutionType).toBe('AI_AGENT');
    batchId = data.batchId;
  });

  it('POST /api/leads/import validates required fields', async () => {
    const { status, data } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: [{ businessName: '' }], // empty name should fail
        solutionType: 'AI_AGENT',
      },
    });

    expect(status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('POST /api/leads/import rejects invalid solutionType', async () => {
    const { status } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: [{ businessName: 'Test' }],
        solutionType: 'INVALID',
      },
    });

    expect(status).toBe(400);
  });

  it('POST /api/leads/import creates WEBSITE batch too', async () => {
    const { status, data } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: [sampleLeads[0]],
        solutionType: 'WEBSITE',
        batchName: 'E2E Test - Website',
      },
    });

    expect(status).toBe(201);
    expect(data.leadsCreated).toBe(1);
  });
});

describe('Lead Listing', () => {
  it('GET /api/leads returns paginated results', async () => {
    const { status, data } = await apiRequest('/api/leads');

    expect(status).toBe(200);
    expect(data.leads).toBeDefined();
    expect(Array.isArray(data.leads)).toBe(true);
    expect(data.pagination).toBeDefined();
    expect(data.pagination.total).toBeGreaterThanOrEqual(sampleLeads.length);

    if (data.leads.length > 0) {
      leadIds = data.leads.map((l: any) => l.id);
    }
  });

  it('GET /api/leads supports pagination params', async () => {
    const { status, data } = await apiRequest('/api/leads?page=1&limit=2');

    expect(status).toBe(200);
    expect(data.leads.length).toBeLessThanOrEqual(2);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(2);
  });

  it('GET /api/leads supports status filter', async () => {
    const { status, data } = await apiRequest('/api/leads?status=PENDING');
    expect(status).toBe(200);
    for (const lead of data.leads) {
      expect(lead.status).toBe('PENDING');
    }
  });

  it('GET /api/leads supports search by business name', async () => {
    const { status, data } = await apiRequest('/api/leads?search=Sunrise');
    expect(status).toBe(200);
    for (const lead of data.leads) {
      expect(lead.businessName.toLowerCase()).toContain('sunrise');
    }
  });

  it('GET /api/leads supports batch filter', async () => {
    const { status, data } = await apiRequest(`/api/leads?batchId=${batchId}`);
    expect(status).toBe(200);
    expect(data.leads.length).toBe(sampleLeads.length);
    for (const lead of data.leads) {
      expect(lead.batchId).toBe(batchId);
    }
  });
});

describe('Lead Detail', () => {
  it('GET /api/leads/:id returns full lead details', async () => {
    if (leadIds.length === 0) return;

    const { status, data } = await apiRequest(`/api/leads/${leadIds[0]}`);
    expect(status).toBe(200);
    expect(data.id).toBe(leadIds[0]);
    expect(data.businessName).toBeDefined();
    expect(data.status).toBeDefined();
  });

  it('GET /api/leads/:id returns 404 for non-existent lead', async () => {
    const { status } = await apiRequest('/api/leads/00000000-0000-0000-0000-000000000000');
    expect(status).toBe(404);
  });

  it('GET /api/leads/:id/preview returns structured preview', async () => {
    if (leadIds.length === 0) return;

    const { status, data } = await apiRequest(`/api/leads/${leadIds[0]}/preview`);
    expect(status).toBe(200);
    expect(data.lead).toBeDefined();
    expect(data.lead.businessName).toBeDefined();
    // Enrichment/deliverables/outreach may be null until processed
  });
});
