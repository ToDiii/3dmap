import type { RequestHandler } from '@sveltejs/kit';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildOverpassQuery, convertTo3D } from '$lib/server/overpass';
import { parsePolygon } from '$lib/server/polygon';

// persistent cache stored on disk
const CACHE_FILE = join(process.cwd(), 'model-cache.json');
let CACHE = new Map<string, any>();

function loadCache() {
  try {
    if (existsSync(CACHE_FILE)) {
      const data = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
      CACHE = new Map(Object.entries(data));
    }
  } catch (err) {
    console.error('Failed to load cache', err);
  }
}

function saveCache() {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(CACHE)));
  } catch (err) {
    console.error('Failed to save cache', err);
  }
}

// initialize cache on server start
loadCache();

function createCacheKey(params: Record<string, any>): string {
  const entries = Object.entries(params).map(([key, value]) => {
    if (Array.isArray(value)) {
      return [key, [...value].sort()];
    }
    if (typeof value === 'object' && value !== null) {
      return [key, JSON.stringify(value)];
    }
    return [key, value];
  });
  entries.sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(Object.fromEntries(entries));
}

async function fetchOverpass(query: string): Promise<any> {
  const urls = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  let lastError: any;
  for (const url of urls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        body: query,
        signal: controller.signal
      });
      if (!resp.ok) {
        throw new Error(`Overpass API error: ${resp.status}`);
      }
      return await resp.json();
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}


export const POST: RequestHandler = async ({ request }) => {
  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const {
    scale,
    baseHeight = 0,
    buildingMultiplier = 1,
    elements,
    bbox,
    shape,
    invalidate = false
  } = payload || {};

  if (typeof scale !== 'number' || !Array.isArray(elements)) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
  }

  const polygon = parsePolygon(shape);
  if (shape && !polygon) {
    return new Response(JSON.stringify({ error: 'Invalid polygon' }), { status: 400 });
  }

  const cacheKey = createCacheKey({
    scale,
    baseHeight,
    buildingMultiplier,
    elements,
    bbox,
    shape: polygon
  });

  if (invalidate) {
    CACHE.delete(cacheKey);
    saveCache();
  } else if (CACHE.has(cacheKey)) {
    return new Response(JSON.stringify(CACHE.get(cacheKey)), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const query = buildOverpassQuery(elements, bbox, polygon ?? undefined);
  console.log('Overpass query', { bbox, shape: polygon, query });
  let osmData;
  try {
    osmData = await fetchOverpass(query);
  } catch (err) {
    console.error('Overpass request failed', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Overpass data', details: String(err) }),
      { status: 500 }
    );
  }

  if (!osmData?.elements || osmData.elements.length === 0) {
    return new Response(JSON.stringify({ features: [], warning: 'Keine Daten vom Overpass-Server' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = convertTo3D(osmData, scale, baseHeight, buildingMultiplier);
  CACHE.set(cacheKey, result);
  saveCache();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
};

