import type { RequestHandler } from '@sveltejs/kit';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildOverpassQuery, convertTo3D } from '$lib/server/overpass';

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
    return [key, value];
  });
  entries.sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(Object.fromEntries(entries));
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
    invalidate = false
  } = payload || {};

  if (typeof scale !== 'number' || !Array.isArray(elements)) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
  }

  const cacheKey = createCacheKey({ scale, baseHeight, buildingMultiplier, elements, bbox });

  if (invalidate) {
    CACHE.delete(cacheKey);
    saveCache();
  } else if (CACHE.has(cacheKey)) {
    return new Response(JSON.stringify(CACHE.get(cacheKey)), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const query = buildOverpassQuery(elements, bbox);
  let osmData;
  try {
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    if (!resp.ok) {
      throw new Error(`Overpass API error: ${resp.status}`);
    }
    osmData = await resp.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch Overpass data' }), { status: 500 });
  }

  const result = convertTo3D(osmData, scale, baseHeight, buildingMultiplier);
  CACHE.set(cacheKey, result);
  saveCache();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
};

