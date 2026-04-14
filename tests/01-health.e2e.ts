import { describe, it, expect } from 'vitest';
import { apiRequest } from './helpers';

describe('Health Check', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const { status, data } = await apiRequest('/api/health');
    expect(status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });
});

describe('Stats', () => {
  it('GET /api/stats/overview returns aggregate counts', async () => {
    const { status, data } = await apiRequest('/api/stats/overview');
    expect(status).toBe(200);
    expect(data.leads).toBeDefined();
    expect(typeof data.leads.total).toBe('number');
    expect(typeof data.leads.completed).toBe('number');
    expect(typeof data.leads.pending).toBe('number');
    expect(data.jobs).toBeDefined();
    expect(typeof data.batches).toBe('number');
  });
});
