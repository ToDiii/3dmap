import type * as GeoJSON from 'geojson';

export interface SceneState {
  v: number;
  model: {
    scale: number;
    baseHeight: number;
    buildingMultiplier: number;
    elementTypes: string[];
  };
  shape?: GeoJSON.Polygon | { bbox: [number, number, number, number] };
  route?: {
    waypoints: Array<{ a: string; c: [number, number] }>;
    line?: GeoJSON.LineString;
  };
  view?: {
    map: { center: [number, number]; zoom: number; bearing?: number; pitch?: number };
    mode: 'map' | 'viewer';
  };
  layers?: {
    buildings3d?: boolean;
    water?: boolean;
    green?: boolean;
  };
  meta?: { ts?: number };
}

export const STATE_VERSION = 1;
