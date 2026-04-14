import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import * as cheerio from 'cheerio';

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

interface ScrapeOptions {
  query: string;
  limit?: number;
}

/**
 * Scrapes business data using Google Maps Places API (New).
 * Falls back to a simple Google search scrape if no API key is configured.
 */
export async function scrapeBusinesses(options: ScrapeOptions): Promise<ScrapedBusiness[]> {
  const { query, limit = 20 } = options;

  // Try Google Places API first (requires GOOGLE_PLACES_API_KEY in settings or env)
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } }).catch(() => null);
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;

  if (placesKey) {
    return scrapeWithPlacesAPI(query, placesKey, limit);
  }

  // Fallback: use Google Maps search scraping via fetch + cheerio
  return scrapeWithWebSearch(query, limit);
}

// ─── Google Places API (Text Search) ───────────────────────────
async function scrapeWithPlacesAPI(
  query: string,
  apiKey: string,
  limit: number,
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];
  let nextPageToken: string | undefined;

  while (results.length < limit) {
    const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
    url.searchParams.set('query', query);
    url.searchParams.set('key', apiKey);
    if (nextPageToken) url.searchParams.set('pagetoken', nextPageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      logger.error({ status: res.status }, 'Places API request failed');
      break;
    }

    const data = (await res.json()) as {
      results: Array<{
        name: string;
        formatted_address: string;
        types: string[];
        rating?: number;
        user_ratings_total?: number;
        place_id: string;
        opening_hours?: { open_now: boolean };
      }>;
      next_page_token?: string;
    };

    for (const place of data.results) {
      if (results.length >= limit) break;

      // Get details for phone, website
      const details = await getPlaceDetails(place.place_id, apiKey);

      results.push({
        businessName: place.name,
        category: place.types?.[0]?.replace(/_/g, ' ') || null,
        address: place.formatted_address || null,
        phone: details.phone || null,
        website: details.website || null,
        email: null, // Places API doesn't provide email
        rating: place.rating || null,
        socials: null,
        hours: details.hours || null,
      });
    }

    nextPageToken = data.next_page_token;
    if (!nextPageToken) break;

    // Google requires a short delay before using next_page_token
    await delay(2000);
  }

  logger.info({ query, count: results.length }, 'Places API scrape complete');
  return results;
}

async function getPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<{ phone: string | null; website: string | null; hours: string | null }> {
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'formatted_phone_number,website,opening_hours');
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) return { phone: null, website: null, hours: null };

    const data = (await res.json()) as {
      result: {
        formatted_phone_number?: string;
        website?: string;
        opening_hours?: { weekday_text?: string[] };
      };
    };

    return {
      phone: data.result.formatted_phone_number || null,
      website: data.result.website || null,
      hours: data.result.opening_hours?.weekday_text?.join(', ') || null,
    };
  } catch {
    return { phone: null, website: null, hours: null };
  }
}

// ─── Web Search Fallback ───────────────────────────────────────
async function scrapeWithWebSearch(
  query: string,
  limit: number,
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];
  const mapQuery = encodeURIComponent(query);

  try {
    // Use Google search to find local businesses
    const searchUrl = `https://www.google.com/search?q=${mapQuery}&num=${Math.min(limit, 20)}&tbm=lcl`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Google search request failed');
      return results;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Parse local business results from Google search
    $('[data-cid]').each((_i, el) => {
      if (results.length >= limit) return false;

      const $el = $(el);
      const name = $el.find('[role="heading"]').first().text().trim() ||
                   $el.find('.dbg0pd').first().text().trim() ||
                   $el.find('.OSrXXb').first().text().trim();

      if (!name) return;

      const address = $el.find('.rllt__details div').eq(1).text().trim() ||
                      $el.find('[class*="address"]').first().text().trim() || null;
      const category = $el.find('.rllt__details div').first().text().trim() || null;
      const ratingText = $el.find('.yi40Hd').text().trim() || $el.find('[aria-label*="stars"]').attr('aria-label') || '';
      const rating = parseFloat(ratingText) || null;
      const phone = extractPhone($el.text()) || null;

      results.push({
        businessName: name,
        category: cleanCategory(category),
        address,
        phone,
        website: null,
        email: null,
        rating,
        socials: null,
        hours: null,
      });
    });

    // Also try alternate selector patterns
    if (results.length === 0) {
      $('div.VkpGBb').each((_i, el) => {
        if (results.length >= limit) return false;
        const $el = $(el);
        const name = $el.find('.dbg0pd').text().trim();
        if (!name) return;

        results.push({
          businessName: name,
          category: $el.find('.rllt__details div').first().text().trim() || null,
          address: $el.find('.rllt__details div').eq(1).text().trim() || null,
          phone: extractPhone($el.text()) || null,
          website: null,
          email: null,
          rating: parseFloat($el.find('.yi40Hd').text()) || null,
          socials: null,
          hours: null,
        });
      });
    }
  } catch (err) {
    logger.error({ err }, 'Web search scrape failed');
  }

  logger.info({ query, count: results.length }, 'Web search scrape complete');
  return results;
}

// ─── Utilities ─────────────────────────────────────────────────

function extractPhone(text: string): string | null {
  const match = text.match(/(\+?1?\s*[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
  return match ? match[1].trim() : null;
}

function cleanCategory(cat: string | null): string | null {
  if (!cat) return null;
  // Remove rating numbers and dots embedded in category text
  return cat.replace(/^\d+(\.\d+)?\s*·?\s*/, '').trim() || null;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
