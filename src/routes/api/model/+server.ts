import type { RequestHandler } from '@sveltejs/kit';

// simple in-memory cache for requests
const CACHE = new Map<string, any>();

function buildOverpassQuery(elements: string[], bbox?: number[]): string {
  const bboxPart = bbox && bbox.length === 4 ? `(${bbox.join(',')})` : '';
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

  const { scale, baseHeight = 0, buildingMultiplier = 1, elements, bbox } = payload || {};

  if (typeof scale !== 'number' || !Array.isArray(elements)) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
  }

  const cacheKey = JSON.stringify(payload);
  if (CACHE.has(cacheKey)) {
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
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export type ModelResult = ReturnType<typeof convertTo3D>;
