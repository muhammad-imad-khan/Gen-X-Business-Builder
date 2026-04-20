const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('genx_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: getAuthHeaders(),
    ...options,
  });
  if (res.status === 401) {
    // Token expired or invalid — force logout
    localStorage.removeItem('genx_token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Lead Types ────────────────────────────────────────────────
export interface Lead {
  id: string;
  batchId: string | null;
  businessName: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  socials: string | null;
  solutionType: 'AI_AGENT' | 'WEBSITE' | null;
  status: 'PENDING' | 'ENRICHING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  enrichment?: Enrichment | null;
  deliverables?: Deliverable[];
  outreach?: OutreachMessage | null;
}

export interface Enrichment {
  id: string;
  businessSummary: string | null;
  services: string[];
  targetAudience: string | null;
  painPoints: string[];
  opportunities: string[];
  digitalPresenceScore: number | null;
  maturityLevel: string | null;
  decisionMakerRole: string | null;
}

export interface Deliverable {
  id: string;
  type: 'AI_AGENT_SPEC' | 'WEBSITE_PROPOSAL' | 'AI_AGENT_APP' | 'WEBSITE_APP';
  title: string | null;
  content: Record<string, any>;
  summary: string | null;
}

export interface OutreachMessage {
  id: string;
  subject: string;
  body: string;
  toName: string | null;
  toEmail: string | null;
  status: 'DRAFT' | 'SENT' | 'FAILED';
}

export interface Deployment {
  id: string;
  status: 'PENDING' | 'DEPLOYING' | 'DEPLOYED' | 'FAILED';
  projectName: string;
  projectUrl: string | null;
  deployUrl: string | null;
  repoUrl: string | null;
  errorMsg: string | null;
  createdAt: string;
}

export interface Batch {
  id: string;
  name: string;
  solutionType: 'AI_AGENT' | 'WEBSITE';
  totalLeads: number;
  completed: number;
  failed: number;
  inProgress: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface Stats {
  leads: {
    total: number;
    pending: number;
    enriching: number;
    processing: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  jobs: { active: number; queued: number };
  batches: number;
}

export interface SettingsResponse {
  aiProvider: string;
  aiModel: string;
  aiApiKeySet: boolean;
  aiApiKeyMasked: string | null;
  vercelConnected: boolean;
  vercelTeamId: string | null;
  githubConnected: boolean;
  githubUsername: string | null;
  autoDeployToVercel: boolean;
  providers: Record<string, { label: string; models: string[] }>;
}

export interface ScrapedBusiness {
  businessName: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  rating: number | null;
  socials: string | null;
  hours: string | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

// ─── API Calls ─────────────────────────────────────────────────
export const api = {
  // Leads
  getLeads: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ leads: Lead[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/leads${qs}`);
  },
  getLead: (id: string) => request<Lead>(`/leads/${id}`),
  getLeadPreview: (id: string) =>
    request<{ lead: Partial<Lead>; enrichment: Enrichment; deliverables: Deliverable[]; outreach: OutreachMessage; deployment: Deployment | null }>(`/leads/${id}/preview`),
  importLeads: (data: { leads: any[]; solutionType: string; batchName?: string }) =>
    request<{ batchId: string; leadsCreated: number }>('/leads/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  startLead: (id: string, solutionType: string) =>
    request<{ jobId: string }>(`/leads/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ solutionType }),
    }),

  // Batches
  getBatches: () => request<Batch[]>('/batches'),
  getBatch: (id: string) => request<Batch & { leads: any[] }>(`/batches/${id}`),
  startBatch: (id: string) =>
    request<{ batchId: string; jobsCreated: number }>(`/batches/${id}/start`, { method: 'POST' }),
  retryBatch: (id: string) =>
    request<{ batchId: string; retriedCount: number }>(`/batches/${id}/retry`, { method: 'POST' }),
  getBatchProgress: (id: string) =>
    request<{ total: number; pending: number; completed: number; failed: number; progressPercent: number }>(
      `/batches/${id}/progress`
    ),

  // Stats
  getStats: () => request<Stats>('/stats/overview'),

  // Jobs
  getJobs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any[]>(`/jobs${qs}`);
  },

  // Processing (serverless)
  processNext: (batchId?: string) =>
    request<{ status: string; leadId?: string; remaining: number }>('/process/next', {
      method: 'POST',
      body: JSON.stringify({ batchId }),
    }),

  // Settings
  getSettings: () =>
    request<SettingsResponse>('/settings'),

  // Profile
  updateProfile: (data: { name?: string; company?: string | null }) =>
    request<{ user: any }>('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  updateAvatar: (avatarUrl: string) =>
    request<{ user: any }>('/auth/me/avatar', { method: 'PUT', body: JSON.stringify({ avatarUrl }) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/auth/me/password', { method: 'PUT', body: JSON.stringify(data) }),

  updateAiSettings: (data: { aiProvider: string; aiModel: string; aiApiKey?: string }) =>
    request<{ aiProvider: string; aiModel: string; aiApiKeySet: boolean; aiApiKeyMasked: string | null }>('/settings/ai', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  connectVercel: (data: { token: string; teamId?: string }) =>
    request<{ connected: boolean; username: string }>('/settings/vercel/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  disconnectVercel: () =>
    request<{ connected: boolean }>('/settings/vercel/disconnect', { method: 'POST' }),
  connectGithub: (data: { token: string }) =>
    request<{ connected: boolean; username: string }>('/settings/github/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  disconnectGithub: () =>
    request<{ connected: boolean }>('/settings/github/disconnect', { method: 'POST' }),
  updateDeployToggle: (autoDeployToVercel: boolean) =>
    request<{ autoDeployToVercel: boolean }>('/settings/deploy-toggle', {
      method: 'PUT',
      body: JSON.stringify({ autoDeployToVercel }),
    }),

  // Scraper
  scrapeBusinesses: (data: { query: string; limit?: number }) =>
    request<{ businesses: ScrapedBusiness[]; count: number; detectedCategory: { name: string; color: string } | null; message: string }>('/scrape', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  scrapeImport: (data: { query: string; solutionType: string; batchName?: string; businesses: ScrapedBusiness[] }) =>
    request<{ batchId: string; leadsCreated: number; solutionType: string }>('/scrape/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Categories
  getCategories: () => request<Category[]>('/categories'),

  // Plan usage
  getPlanUsage: () =>
    request<{ plan: string; label: string; maxProcessedLeads: number; processedLeads: number; canProcess: boolean; remaining: number; maxDeployments: number; deploymentCount: number; canDeploy: boolean }>('/auth/me/usage'),
  createCategory: (data: { name: string; color?: string }) =>
    request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: { name?: string; color?: string }) =>
    request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    request<{ deleted: boolean }>(`/categories/${id}`, { method: 'DELETE' }),
};

// ─── Polling Helper ────────────────────────────────────────────
// Replaces WebSocket for Vercel serverless deployment.
// Calls `callback` every `intervalMs` with fresh data, returns cleanup function.
export function startPolling(callback: () => void, intervalMs = 3000): () => void {
  const id = setInterval(callback, intervalMs);
  return () => clearInterval(id);
}

// ─── Batch Processing Poller ───────────────────────────────────
// Keeps calling /api/process/next until no pending leads remain for a batch.
export function startBatchProcessor(
  batchId: string,
  onProgress: () => void,
  intervalMs = 2000,
): () => void {
  let active = true;

  async function tick() {
    if (!active) return;
    try {
      const result = await api.processNext(batchId);
      onProgress();
      if (result.remaining > 0 && active) {
        setTimeout(tick, intervalMs);
      }
    } catch {
      if (active) setTimeout(tick, intervalMs * 2);
    }
  }

  tick();
  return () => { active = false; };
}

// ─── WebSocket (local dev fallback) ────────────────────────────
export function createWebSocket(onMessage: (event: string, data: any) => void): { close: () => void } {
  // On Vercel (production) there's no WebSocket server — use polling
  if (import.meta.env.PROD) {
    // Return a no-op handle; pages use startPolling() instead
    return { close: () => {} };
  }

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage(parsed.event, parsed.data);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setTimeout(() => createWebSocket(onMessage), 3000);
    };

    return { close: () => ws.close() };
  } catch {
    return { close: () => {} };
  }
}
