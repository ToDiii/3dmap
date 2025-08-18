import type { RequestHandler } from '@sveltejs/kit';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildOverpassQuery, convertTo3D } from '$lib/server/overpass';
import { parsePolygon } from '$lib/server/polygon';
import { env } from '$lib/server/env';
import {
  polygonAreaKm2,
  bboxAreaKm2,
  bboxToTiles,
  splitPolygonToBboxes,
  polygonToBbox
} from '$lib/server/tiling';
import { fetchOverpass } from '$lib/server/overpassClient';

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
    minArea = 0,
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

  const baseKey = createCacheKey({
    scale,
    baseHeight,
    buildingMultiplier,
    minArea,
    elements,
    shape: polygon,
    bbox
  });

  // determine tiling
  let tiles: Array<[number, number, number, number]> = [];
  let usePolygon = false;
  if (polygon) {
    const area = polygonAreaKm2(polygon);
    if (area > env.OVERPASS_MAX_AREA_KM2) {
      tiles = splitPolygonToBboxes(polygon, env.OVERPASS_TILE_DEG);
    } else {
      tiles = [polygonToBbox(polygon)];
      usePolygon = true;
    }
  } else if (bbox) {
    const area = bboxAreaKm2(bbox);
    if (area > env.OVERPASS_MAX_AREA_KM2) {
      tiles = bboxToTiles(bbox, env.OVERPASS_TILE_DEG);
    } else {
      tiles = [bbox];
    }
  } else {
    return new Response(JSON.stringify({ error: 'Missing shape or bbox' }), { status: 400 });
  }

  // if request cache exists and no tiling
  const cacheKey = baseKey;
  if (!invalidate && tiles.length === 1 && CACHE.has(cacheKey)) {
    const cached = CACHE.get(cacheKey);
    return new Response(JSON.stringify(cached), { headers: { 'Content-Type': 'application/json' } });
  }

  const featureMap = new Map<string | number, any>();
  const geoMap = new Map<string | number, any>();
  let attempts = 0;
  let durationMs = 0;
  let endpointUsed = '';
  let cacheHit = true;

  for (const tile of tiles) {
    const tileKey = `${baseKey}:${tile.join(',')}`;
    let tileResult;
    if (!invalidate && CACHE.has(tileKey)) {
      tileResult = CACHE.get(tileKey);
    } else {
      cacheHit = false;
      const query = buildOverpassQuery(elements, tile, usePolygon ? polygon : undefined);
      let data;
      try {
        const res = await fetchOverpass(query);
        data = res.data;
        attempts += res.meta.attempts;
        durationMs += res.meta.durationMs;
        endpointUsed = res.meta.endpointUsed;
      } catch (err: any) {
        const status = err.status || 500;
        const message =
          status === 504 ? 'Overpass timeout' : status === 429 ? 'Rate limited' : 'Overpass request failed';
        return new Response(JSON.stringify({ error: message }), { status });
      }
      tileResult = convertTo3D(data, scale, baseHeight, buildingMultiplier, minArea);
      CACHE.set(tileKey, tileResult);
    }
    for (const f of tileResult.features) {
      featureMap.set(f.id, f);
    }
    for (const gf of tileResult.geojson.features) {
      const id = (gf as any).id || gf.properties?.id || gf.properties?.['@id'] || Math.random();
      geoMap.set(id, gf);
    }
  }

  saveCache();

  const result = {
    features: Array.from(featureMap.values()),
    geojson: { type: 'FeatureCollection', features: Array.from(geoMap.values()) }
  };

  CACHE.set(cacheKey, result);
  saveCache();

  const meta = {
    endpoint: endpointUsed,
    attempts,
    durationMs,
    tiles: tiles.length,
    cache: cacheHit ? 'hit' : 'miss'
  } as const;

  console.info('overpass', {
    cache: meta.cache,
    tiles: meta.tiles,
    endpoint: meta.endpoint,
    attempts: meta.attempts,
    durationMs: meta.durationMs,
    featureCount: result.features.length
  });

  return new Response(JSON.stringify({ ...result, meta }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
