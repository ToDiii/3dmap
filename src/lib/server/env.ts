export interface Env {
	OVERPASS_ENDPOINTS: string[];
	OVERPASS_TIMEOUT_MS: number;
	OVERPASS_MAX_RETRIES: number;
	OVERPASS_RETRY_BASE_MS: number;
	OVERPASS_MAX_AREA_KM2: number;
	OVERPASS_TILE_DEG: number;
	OVERPASS_CONCURRENCY: number;
	OVERPASS_USER_AGENT: string;
	ROUTE_BUFFER_METERS: number;
	GEOCODE_CACHE_TTL_MS: number;
	GEOCODE_CACHE_MAX_ENTRIES: number;
	ROUTING_CACHE_TTL_MS: number;
	ROUTING_CACHE_MAX_ENTRIES: number;
	API_RATE_LIMIT_PER_MIN: number;
	SERVER_RETRY_BASE_MS: number;
	SERVER_MAX_RETRIES: number;
}

function parseNumber(value: string | undefined, fallback: number): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

export const env: Env = {
	OVERPASS_ENDPOINTS: (
		process.env.OVERPASS_ENDPOINTS ||
		'https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter'
	)
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean),
	OVERPASS_TIMEOUT_MS: parseNumber(process.env.OVERPASS_TIMEOUT_MS, 30_000),
	OVERPASS_MAX_RETRIES: parseNumber(process.env.OVERPASS_MAX_RETRIES, 2),
	OVERPASS_RETRY_BASE_MS: parseNumber(process.env.OVERPASS_RETRY_BASE_MS, 500),
	OVERPASS_MAX_AREA_KM2: parseNumber(process.env.OVERPASS_MAX_AREA_KM2, 25),
	OVERPASS_TILE_DEG: parseNumber(process.env.OVERPASS_TILE_DEG, 0.05),
	OVERPASS_CONCURRENCY: parseNumber(process.env.OVERPASS_CONCURRENCY, 1),
	OVERPASS_USER_AGENT: process.env.OVERPASS_USER_AGENT || '3dmap/1.0 (+contact@example.com)',
	ROUTE_BUFFER_METERS: parseNumber(process.env.ROUTE_BUFFER_METERS, 75),
	GEOCODE_CACHE_TTL_MS: parseNumber(process.env.GEOCODE_CACHE_TTL_MS, 86_400_000),
	GEOCODE_CACHE_MAX_ENTRIES: parseNumber(process.env.GEOCODE_CACHE_MAX_ENTRIES, 5000),
	ROUTING_CACHE_TTL_MS: parseNumber(process.env.ROUTING_CACHE_TTL_MS, 3_600_000),
	ROUTING_CACHE_MAX_ENTRIES: parseNumber(process.env.ROUTING_CACHE_MAX_ENTRIES, 2000),
	API_RATE_LIMIT_PER_MIN: parseNumber(process.env.API_RATE_LIMIT_PER_MIN, 120),
	SERVER_RETRY_BASE_MS: parseNumber(process.env.SERVER_RETRY_BASE_MS, 400),
	SERVER_MAX_RETRIES: parseNumber(process.env.SERVER_MAX_RETRIES, 2),
};
