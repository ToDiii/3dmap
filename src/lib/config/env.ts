export type GeocodeProvider = 'nominatim' | 'opencage' | 'mapbox';
export type RoutingProvider = 'openrouteservice' | 'osrm' | 'graphhopper';
export type ElevationProvider = 'opentopodata' | 'open-elevation' | 'mapbox-terrain';

function getEnv(name: string): string | undefined {
  return (import.meta as any).env?.[name] ?? (globalThis as any)?.process?.env?.[name];
}

function assertProvider<T extends string>(name: string, value: string, options: readonly T[]): T {
  if ((options as readonly string[]).includes(value)) return value as T;
  throw new Error(`Invalid ${name}: ${value}`);
}

const geocodeProviderRaw = getEnv('GEOCODE_PROVIDER') ?? 'nominatim';
export const GEOCODE_PROVIDER = assertProvider<GeocodeProvider>(
  'GEOCODE_PROVIDER',
  geocodeProviderRaw,
  ['nominatim', 'opencage', 'mapbox'] as const
);

export const GEOCODE_API_KEY: string | undefined = getEnv('GEOCODE_API_KEY');

const routingProviderRaw = getEnv('ROUTING_PROVIDER') ?? 'openrouteservice';
export const ROUTING_PROVIDER = assertProvider<RoutingProvider>(
  'ROUTING_PROVIDER',
  routingProviderRaw,
  ['openrouteservice', 'osrm', 'graphhopper'] as const
);

export const ROUTING_API_KEY: string | undefined = getEnv('ROUTING_API_KEY');

const maxWaypointsRaw = getEnv('ROUTING_MAX_WAYPOINTS');
const maxWaypoints = maxWaypointsRaw ? parseInt(maxWaypointsRaw, 10) : 25;
if (isNaN(maxWaypoints) || maxWaypoints <= 0) {
  throw new Error('Invalid ROUTING_MAX_WAYPOINTS');
}
export const ROUTING_MAX_WAYPOINTS: number = maxWaypoints;

const elevationProviderRaw = getEnv('ELEVATION_PROVIDER') ?? 'opentopodata';
export const ELEVATION_PROVIDER = assertProvider<ElevationProvider>(
  'ELEVATION_PROVIDER',
  elevationProviderRaw,
  ['opentopodata', 'open-elevation', 'mapbox-terrain'] as const
);

export const ELEVATION_API_KEY: string | undefined = getEnv('ELEVATION_API_KEY');

function getNumberEnv(name: string, def: number): number {
  const raw = getEnv(name);
  const val = raw ? parseInt(raw, 10) : def;
  if (isNaN(val) || val <= 0) throw new Error(`Invalid ${name}`);
  return val;
}

export const ELEVATION_BATCH_SIZE = getNumberEnv('ELEVATION_BATCH_SIZE', 100);
export const ELEVATION_MAX_SAMPLES = getNumberEnv('ELEVATION_MAX_SAMPLES', 2000);
export const ROUTE_BUFFER_METERS = getNumberEnv('ROUTE_BUFFER_METERS', 75);
