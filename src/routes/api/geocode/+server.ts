import type { RequestHandler } from '@sveltejs/kit';
import { join } from 'path';
import { createCache } from '$lib/server/cache';
import { env } from '$lib/server/env';
import { allowRequest } from '$lib/server/rate';
import { withRetry } from '$lib/server/retry';
import { geocodeAddress, type GeocodeResult } from '$lib/server/providers/geocode';
import { GEOCODE_PROVIDER } from '$lib/config/env';

const cache = createCache<GeocodeResult[]>({
  ttlMs: env.GEOCODE_CACHE_TTL_MS,
  maxEntries: env.GEOCODE_CACHE_MAX_ENTRIES,
  persistFile: join(process.cwd(), 'geocode-cache.json')
});

function makeKey(q: string, provider: string) {
  return `${provider}:${q.trim().toLowerCase()}`;
}

export const POST: RequestHandler = async ({ request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }
  const q = payload?.q;
  const provider = payload?.provider || GEOCODE_PROVIDER || 'nominatim';
  if (!q || typeof q !== 'string' || q.trim() === '') {
    return new Response(JSON.stringify({ error: 'Missing q' }), { status: 400 });
  }
  if (!allowRequest('geocode')) {
    return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429 });
  }
  const key = makeKey(q, provider);
  const cached = cache.get(key);
  const start = Date.now();
  if (cached) {
    const durationMs = Date.now() - start;
    console.info('geocode', { cache: 'hit', durationMs, provider });
    const body = { results: cached, meta: { cache: 'hit', attempts: 0, durationMs, provider } };
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { result, attempts, durationMs } = await withRetry(
      () => geocodeAddress(q, provider),
      { maxRetries: env.SERVER_MAX_RETRIES, baseMs: env.SERVER_RETRY_BASE_MS }
    );
    cache.set(key, result);
    console.info('geocode', { cache: 'miss', durationMs, provider, attempts });
    const meta: any = { cache: 'miss', attempts, durationMs, provider };
    const body = { results: result, meta };
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const status = err.status || 500;
    const message =
      status === 429
        ? 'Rate limited'
        : status === 503 || status === 504
        ? 'Provider unavailable'
        : 'Geocoding failed';
    return new Response(JSON.stringify({ error: message }), { status });
  }
};
