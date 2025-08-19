import type { RequestHandler } from '@sveltejs/kit';
import { join } from 'path';
import { createCache } from '$lib/server/cache';
import { env } from '$lib/server/env';
import { allowRequest } from '$lib/server/rate';
import { withRetry } from '$lib/server/retry';
import { routeWaypoints, type RouteResult } from '$lib/server/providers/route';
import { ROUTING_PROVIDER } from '$lib/config/env';

const cache = createCache<RouteResult>({
  ttlMs: env.ROUTING_CACHE_TTL_MS,
  maxEntries: env.ROUTING_CACHE_MAX_ENTRIES,
  persistFile: join(process.cwd(), 'route-cache.json')
});

function keyFor(coords: Array<[number, number]>, provider: string) {
  const coordStr = coords
    .map((c) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`)
    .join(';');
  return `${provider}:${coordStr}`;
}

export const POST: RequestHandler = async ({ request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }
  const coords = payload?.coords;
  const provider = payload?.provider || ROUTING_PROVIDER;
  if (!Array.isArray(coords) || coords.length < 2) {
    return new Response(JSON.stringify({ error: 'Invalid coords' }), { status: 400 });
  }
  if (!allowRequest('route')) {
    return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429 });
  }
  const key = keyFor(coords, provider);
  const cached = cache.get(key);
  const start = Date.now();
  if (cached) {
    const durationMs = Date.now() - start;
    console.info('route', { cache: 'hit', durationMs, provider });
    const body = { result: cached, meta: { cache: 'hit', attempts: 0, durationMs, provider } };
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { result, attempts, durationMs } = await withRetry(
      () => routeWaypoints(coords, provider),
      { maxRetries: env.SERVER_MAX_RETRIES, baseMs: env.SERVER_RETRY_BASE_MS }
    );
    cache.set(key, result);
    console.info('route', { cache: 'miss', durationMs, provider, attempts });
    const meta: any = { cache: 'miss', attempts, durationMs, provider };
    const body = { result, meta };
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    const status = err.status || 500;
    const message =
      status === 429
        ? 'Rate limited'
        : status === 503 || status === 504
        ? 'Provider unavailable'
        : err.message || 'Routing failed';
    return new Response(JSON.stringify({ error: message }), { status });
  }
};
