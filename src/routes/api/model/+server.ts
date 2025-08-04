import type { RequestHandler } from '@sveltejs/kit';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

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

function buildOverpassQuery(
  elements: string[],
  bbox?: [number, number, number, number]
): string {
  // bbox expected as [south, west, north, east]
  const bboxPart = bbox ? `(${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]})` : '';
  let query = '[out:json][timeout:25];(';
  if (elements.includes('buildings')) {
    query += `way["building"]${bboxPart};relation["building"]${bboxPart};`;
  }
  if (elements.includes('roads')) {
    query += `way["highway"]${bboxPart};`;
  }
  if (elements.includes('water')) {
    query += `way["natural"="water"]${bboxPart};relation["natural"="water"]${bboxPart};`;
  }
  query += ');out geom;';
  return query;
}

function convertTo3D(data: any, scale: number, baseHeight: number, buildingMultiplier: number) {
  const features: any[] = [];
  for (const element of data.elements || []) {
    if (element.geometry) {
      const coords = element.geometry.map((p: any) => [p.lon * scale, baseHeight, p.lat * scale]);
      let height = 0;
      if (element.tags?.height) {
        const m = /([0-9.]+)/.exec(element.tags.height);
        if (m) height = parseFloat(m[1]);
      } else if (element.tags?.['building:levels']) {
        height = parseFloat(element.tags['building:levels']) * 3;
      }
      if (element.tags?.building) {
        height = height * buildingMultiplier + baseHeight;
      }
      features.push({
        id: element.id,
        type: element.tags?.building ? 'building' : element.tags?.highway ? 'road' : 'water',
        geometry: coords,
        height
      });
    }
  }
  return { features };
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

export type ModelResult = ReturnType<typeof convertTo3D>;
