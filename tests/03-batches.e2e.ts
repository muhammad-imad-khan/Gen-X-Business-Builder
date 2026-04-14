import { describe, it, expect } from 'vitest';
import { apiRequest, sampleLeads } from './helpers';

let batchId: string;

describe('Batch Operations', () => {
  it('creates a new batch via lead import', async () => {
    const { status, data } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: [sampleLeads[0]],
        solutionType: 'AI_AGENT',
        batchName: 'E2E Batch Test',
      },
    });

    expect(status).toBe(201);
    batchId = data.batchId;
  });

  it('GET /api/batches lists all batches', async () => {
    const { status, data } = await apiRequest('/api/batches');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const batch = data.find((b: any) => b.id === batchId);
    expect(batch).toBeDefined();
    expect(batch.name).toBe('E2E Batch Test');
    expect(batch.solutionType).toBe('AI_AGENT');
  });

  it('GET /api/batches/:id returns batch with leads', async () => {
    const { status, data } = await apiRequest(`/api/batches/${batchId}`);
    expect(status).toBe(200);
    expect(data.id).toBe(batchId);
    expect(data.leads).toBeDefined();
    expect(data.leads.length).toBe(1);
    expect(data.leads[0].businessName).toBe(sampleLeads[0].businessName);
  });

  it('GET /api/batches/:id returns 404 for invalid id', async () => {
    const { status } = await apiRequest('/api/batches/00000000-0000-0000-0000-000000000000');
    expect(status).toBe(404);
  });

  it('GET /api/batches/:id/progress returns progress stats', async () => {
    const { status, data } = await apiRequest(`/api/batches/${batchId}/progress`);
    expect(status).toBe(200);
    expect(data.batchId).toBe(batchId);
    expect(data.total).toBe(1);
    expect(typeof data.pending).toBe('number');
    expect(typeof data.completed).toBe('number');
    expect(typeof data.failed).toBe('number');
    expect(typeof data.progressPercent).toBe('number');
  });

  it('POST /api/batches/:id/start initiates processing', async () => {
    const { status, data } = await apiRequest(`/api/batches/${batchId}/start`, {
      method: 'POST',
    });

    expect(status).toBe(200);
    expect(data.batchId || data.totalLeads).toBeDefined();
  });

  it('POST /api/batches/:id/start returns 409 if already processing', async () => {
    // Wait a brief moment for the status to update
    await new Promise((r) => setTimeout(r, 1000));

    const { status } = await apiRequest(`/api/batches/${batchId}/start`, {
      method: 'POST',
    });

    // May be 409 (already processing) or 400 (no pending leads) — both valid
    expect([400, 409]).toContain(status);
  });
});
