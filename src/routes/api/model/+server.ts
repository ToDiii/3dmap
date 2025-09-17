import type { RequestHandler } from '@sveltejs/kit';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { buildOverpassQuery, convertTo3D } from '$lib/server/overpass';
import { parsePolygon } from '$lib/server/polygon';
import { bufferLine } from '$lib/geo/buffer';
import type { Polygon } from 'geojson';
import { env } from '$lib/server/env';
import {
	polygonAreaKm2,
	bboxAreaKm2,
	bboxToTiles,
	splitPolygonToBboxes,
	polygonToBbox,
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
	} catch (_) {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
	}

        const {
                scale,
                baseHeight = 0,
                buildingMultiplier = 1,
                minArea = 0,
                minBuildingHeightMM = 0,
                clipToShape = false,
                waterHeightMM = 100,
                greeneryHeightMM = 100,
                beachHeightMM = 100,
                pierHeightMM = 100,
                minWaterAreaM2 = 0,
                footpathRoadsEnabled = true,
                oceanEnabled = true,
                beachEnabled = false,
                piersEnabled = false,
                elements,
                bbox,
                shape,
                route,
                routeBufferMeters,
		corridorOnly = false,
		invalidate = false,
	} = payload || {};

	if (typeof scale !== 'number' || !Array.isArray(elements)) {
		return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 });
	}

	const polygon = parsePolygon(shape);
	if (shape && !polygon) {
		return new Response(JSON.stringify({ error: 'Invalid polygon' }), { status: 400 });
	}

	let routePolygon: Polygon | undefined;
	if (route && !polygon && !bbox) {
		try {
			routePolygon = bufferLine(route, routeBufferMeters || env.ROUTE_BUFFER_METERS);
		} catch {
			return new Response(JSON.stringify({ error: 'Invalid route' }), { status: 400 });
		}
	}

	const baseKey = createCacheKey({
		scale,
		baseHeight,
		buildingMultiplier,
		minArea,
                minBuildingHeightMM,
                clipToShape,
                waterHeightMM,
                greeneryHeightMM,
                beachHeightMM,
                pierHeightMM,
                minWaterAreaM2,
                footpathRoadsEnabled,
                oceanEnabled,
                beachEnabled,
                piersEnabled,
                elements,
                shape: polygon || routePolygon,
                bbox,
                routeBufferMeters,
                corridorOnly,
	});

	// determine tiling
	let tiles: Array<[number, number, number, number]> = [];
	let usePolygon = false;
	const polyForArea = corridorOnly && routePolygon ? routePolygon : polygon || routePolygon;
	if (polyForArea) {
		const area = polygonAreaKm2(polyForArea);
		if (area > env.OVERPASS_MAX_AREA_KM2) {
			tiles = splitPolygonToBboxes(polyForArea, env.OVERPASS_TILE_DEG);
		} else {
			tiles = [polygonToBbox(polyForArea)];
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
		return new Response(JSON.stringify(cached), {
			headers: { 'Content-Type': 'application/json' },
		});
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
                        const query = buildOverpassQuery(
                                elements,
                                tile,
                                usePolygon ? polyForArea : undefined,
                                {
                                        footpathRoadsEnabled,
                                        beachEnabled,
                                        piersEnabled,
                                        oceanEnabled,
                                }
                        );
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
					status === 504
						? 'Overpass timeout'
						: status === 429
							? 'Rate limited'
							: 'Overpass request failed';
				return new Response(JSON.stringify({ error: message }), { status });
			}
                        tileResult = convertTo3D(data, scale, baseHeight, buildingMultiplier, {
                                minBuildingAreaM2: minArea,
                                clipPolygon: clipToShape ? polygon : undefined,
                                minBuildingHeightMM,
                                waterHeightMM,
                                greeneryHeightMM,
                                beachHeightMM,
                                pierHeightMM,
                                minWaterAreaM2,
                                beachEnabled,
                                piersEnabled,
                                oceanEnabled,
                        });
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
		geojson: { type: 'FeatureCollection', features: Array.from(geoMap.values()) },
	};

	CACHE.set(cacheKey, result);
	saveCache();

	const meta = {
		endpoint: endpointUsed,
		attempts,
		durationMs,
		tiles: tiles.length,
		cache: cacheHit ? 'hit' : 'miss',
	} as const;

	console.info('overpass', {
		cache: meta.cache,
		tiles: meta.tiles,
		endpoint: meta.endpoint,
		attempts: meta.attempts,
		durationMs: meta.durationMs,
		featureCount: result.features.length,
	});

	return new Response(JSON.stringify({ ...result, meta }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
