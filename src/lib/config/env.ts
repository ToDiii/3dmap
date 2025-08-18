export type GeocodeProvider = 'nominatim' | 'opencage' | 'mapbox';
export type RoutingProvider = 'openrouteservice' | 'osrm' | 'graphhopper';

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
