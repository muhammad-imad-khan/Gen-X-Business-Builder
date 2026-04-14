import { describe, it, expect } from 'vitest';
import { apiRequest, sampleLeads, pollUntil } from './helpers';

/**
 * Full end-to-end processing test.
 *
 * This test imports a lead → starts processing → waits for completion → validates output.
 * Requires OPENAI_API_KEY in the environment (or the deployed Vercel app to have it).
 *
 * Set E2E_FULL=1 to run this test (skipped by default since it calls OpenAI and costs money).
 * Example: E2E_FULL=1 BASE_URL=https://your-app.vercel.app npx vitest run
 */
const runFull = process.env.E2E_FULL === '1';

describe.skipIf(!runFull)('Full Processing Pipeline (E2E)', () => {
  let batchId: string;
  let leadId: string;

  it('Step 1: Import a single lead for AI_AGENT processing', async () => {
    const { status, data } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: [sampleLeads[0]],
        solutionType: 'AI_AGENT',
        batchName: 'E2E Full Pipeline Test',
      },
    });

    expect(status).toBe(201);
    batchId = data.batchId;

    // Get the lead ID
    const { data: batchData } = await apiRequest(`/api/batches/${batchId}`);
    leadId = batchData.leads[0].id;
    expect(leadId).toBeDefined();
  });

  it('Step 2: Start processing the lead', async () => {
    const { status, data } = await apiRequest(`/api/leads/${leadId}/start`, {
      method: 'POST',
      body: { solutionType: 'AI_AGENT' },
    });

    expect(status).toBe(200);
    expect(data.message).toContain('started');
  });

  it('Step 3: Poll until lead is completed (may take up to 90s)', async () => {
    const result = await pollUntil(
      async () => {
        const { data } = await apiRequest(`/api/leads/${leadId}`);
        return data;
      },
      (lead) => lead.status === 'COMPLETED' || lead.status === 'FAILED',
      { interval: 5000, timeout: 90_000 }
    );

    expect(result.status).toBe('COMPLETED');
  });

  it('Step 4: Validate enrichment data exists', async () => {
    const { data } = await apiRequest(`/api/leads/${leadId}/preview`);

    expect(data.enrichment).toBeDefined();
    expect(data.enrichment.businessSummary).toBeTruthy();
    expect(data.enrichment.services.length).toBeGreaterThan(0);
    expect(data.enrichment.painPoints.length).toBeGreaterThan(0);
    expect(data.enrichment.digitalPresenceScore).toBeGreaterThanOrEqual(0);
    expect(data.enrichment.digitalPresenceScore).toBeLessThanOrEqual(100);
  });

  it('Step 5: Validate AI Agent deliverable exists', async () => {
    const { data } = await apiRequest(`/api/leads/${leadId}/preview`);

    expect(data.deliverables).toBeDefined();
    expect(data.deliverables.length).toBeGreaterThan(0);

    const aiSpec = data.deliverables.find((d: any) => d.type === 'AI_AGENT_SPEC');
    expect(aiSpec).toBeDefined();
    expect(aiSpec.content).toBeDefined();
    expect(aiSpec.content.agentName).toBeTruthy();
    expect(aiSpec.content.agentType).toBeTruthy();
    expect(aiSpec.content.capabilities).toBeDefined();
    expect(aiSpec.content.overview).toBeTruthy();
  });

  it('Step 5b: Validate AI Agent App was generated', async () => {
    const { data } = await apiRequest(`/api/leads/${leadId}/preview`);

    const aiApp = data.deliverables.find((d: any) => d.type === 'AI_AGENT_APP');
    expect(aiApp).toBeDefined();
    expect(aiApp.content.files).toBeDefined();
    expect(aiApp.content.fileCount).toBeGreaterThan(0);
    expect(aiApp.content.framework).toBe('nextjs');

    // Verify key files exist
    const files = aiApp.content.files;
    expect(files['package.json']).toBeTruthy();
    expect(files['src/app/page.tsx']).toBeTruthy();
    expect(files['src/app/layout.tsx']).toBeTruthy();

    // The page should contain the agent name and chat widget
    expect(files['src/app/page.tsx']).toContain('GenX Assistant');
    expect(files['src/app/page.tsx']).toContain('Send');
  });

  it('Step 6: Validate outreach email exists', async () => {
    const { data } = await apiRequest(`/api/leads/${leadId}/preview`);

    expect(data.outreach).toBeDefined();
    expect(data.outreach.subject).toBeTruthy();
    expect(data.outreach.body).toBeTruthy();
    // Should reference the business
    expect(
      data.outreach.body.toLowerCase().includes('sunrise') ||
      data.outreach.body.toLowerCase().includes('bakery')
    ).toBe(true);
  });

  it('Step 7: Batch progress should show completed', async () => {
    const { data } = await apiRequest(`/api/batches/${batchId}/progress`);

    expect(data.total).toBe(1);
    expect(data.completed).toBe(1);
    expect(data.progressPercent).toBe(100);
  });
});

describe.skipIf(!runFull)('Full Processing Pipeline - Website Flow', () => {
  let leadId: string;

  it('Import and process a Website solution lead', async () => {
    const { data: importData } = await apiRequest('/api/leads/import', {
      method: 'POST',
      body: {
        leads: [sampleLeads[2]], // Green Thumb Landscaping
        solutionType: 'WEBSITE',
        batchName: 'E2E Website Pipeline Test',
      },
    });

    const { data: batchData } = await apiRequest(`/api/batches/${importData.batchId}`);
    leadId = batchData.leads[0].id;

    // Start processing
    await apiRequest(`/api/leads/${leadId}/start`, {
      method: 'POST',
      body: { solutionType: 'WEBSITE' },
    });

    // Poll until complete
    const result = await pollUntil(
      async () => {
        const { data } = await apiRequest(`/api/leads/${leadId}`);
        return data;
      },
      (lead) => lead.status === 'COMPLETED' || lead.status === 'FAILED',
      { interval: 5000, timeout: 90_000 }
    );

    expect(result.status).toBe('COMPLETED');
  });

  it('Validate Website proposal deliverable', async () => {
    const { data } = await apiRequest(`/api/leads/${leadId}/preview`);

    const proposal = data.deliverables.find((d: any) => d.type === 'WEBSITE_PROPOSAL');
    expect(proposal).toBeDefined();
    expect(proposal.content).toBeDefined();
    expect(proposal.content.executiveSummary).toBeTruthy();
    expect(proposal.content.currentSiteAudit).toBeDefined();
    expect(proposal.content.proposedStructure).toBeDefined();
  });

  it('Validate Website App was generated', async () => {
    const { data } = await apiRequest(`/api/leads/${leadId}/preview`);

    const webApp = data.deliverables.find((d: any) => d.type === 'WEBSITE_APP');
    expect(webApp).toBeDefined();
    expect(webApp.content.files).toBeDefined();
    expect(webApp.content.fileCount).toBeGreaterThan(0);
    expect(webApp.content.framework).toBe('nextjs');

    // Verify key files exist
    const files = webApp.content.files;
    expect(files['package.json']).toBeTruthy();
    expect(files['src/app/page.tsx']).toBeTruthy();
    expect(files['src/app/layout.tsx']).toBeTruthy();

    // The page should reference the business
    expect(files['src/app/page.tsx']).toContain('Green Thumb Landscaping');
  });
});
