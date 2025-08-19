import { describe, it, expect } from 'vitest';
import { bufferLine } from './buffer';
import { polygonAreaKm2 } from '$lib/server/tiling';
import type * as GeoJSON from 'geojson';

describe('bufferLine', () => {
  it('creates polygon with reasonable area', () => {
    const line: GeoJSON.LineString = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [0, 0.01]
      ]
    };
    const poly = bufferLine(line, 100);
    expect(poly.type).toBe('Polygon');
    const area = polygonAreaKm2(poly) * 1_000_000; // m^2
    expect(area).toBeGreaterThan(200000);
    expect(area).toBeLessThan(260000);
  });
});
