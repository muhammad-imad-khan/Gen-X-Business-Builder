/**
 * E2E Test Helper
 *
 * BASE_URL is set to the deployed Vercel URL or local server.
 * Usage: BASE_URL=https://your-app.vercel.app npx vitest run
 */
function resolveBaseUrl(): string {
  const candidate = (process.env.BASE_URL || '').trim();
  if (!candidate || candidate === '/' || candidate === '//') {
    return 'http://localhost:3001';
  }
  if (/^https?:\/\//i.test(candidate)) {
    return candidate.replace(/\/$/, '');
  }
  return 'http://localhost:3001';
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<{ status: number; data: T }> {
  const { method = 'GET', body, headers = {} } = options;
  const baseUrl = resolveBaseUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

export function getBaseUrl() {
  return resolveBaseUrl();
}

/**
 * Poll until a condition is met, with timeout.
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  { interval = 3000, timeout = 90000 } = {}
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = await fn();
    if (condition(result)) return result;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`pollUntil timed out after ${timeout}ms`);
}

/**
 * Sample lead data mimicking the Map Scraper CSV export format.
 */
export const sampleLeads = [
  {
    businessName: 'Sunrise Bakery & Cafe',
    category: 'Bakery',
    address: '123 Main Street, Portland, OR 97201',
    phone: '+1-503-555-0101',
    website: 'https://example.com',
    email: 'hello@sunrisebakery.com',
    rating: 4.7,
    socials: 'https://instagram.com/sunrisebakery',
    hours: 'Mon-Sat: 6am-6pm, Sun: 7am-2pm',
  },
  {
    businessName: 'Peak Performance Auto Repair',
    category: 'Auto Repair',
    address: '456 Industrial Blvd, Denver, CO 80202',
    phone: '+1-303-555-0202',
    website: '',
    email: '',
    rating: 4.2,
    socials: '',
    hours: 'Mon-Fri: 8am-5pm',
  },
  {
    businessName: 'Green Thumb Landscaping',
    category: 'Landscaping',
    address: '789 Oak Avenue, Austin, TX 78701',
    phone: '+1-512-555-0303',
    website: 'https://example.com',
    email: 'info@greenthumb.com',
    rating: 4.9,
    socials: 'https://facebook.com/greenthumblandscaping',
    hours: 'Mon-Sat: 7am-7pm',
  },
];
