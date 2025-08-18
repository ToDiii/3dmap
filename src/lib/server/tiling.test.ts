import { describe, it, expect } from 'vitest';
import { bboxToTiles, splitPolygonToBboxes } from './tiling';

describe('tiling', () => {
  it('splits bbox into tiles', () => {
    const tiles = bboxToTiles([0, 0, 0.2, 0.2], 0.05);
    expect(tiles.length).toBeGreaterThan(1);
  });

  it('splits polygon into tiles', () => {
    const poly: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [[[0, 0], [0.2, 0], [0.2, 0.2], [0, 0.2], [0, 0]]]
    };
    const tiles = splitPolygonToBboxes(poly, 0.05);
    expect(tiles.length).toBeGreaterThan(1);
  });

  it('merges tile results without duplicates', () => {
    const tile1 = {
      features: [{ id: 1 }, { id: 2 }],
      geojson: { type: 'FeatureCollection', features: [{ properties: { id: 1 } }, { properties: { id: 2 } }] }
    };
    const tile2 = {
      features: [{ id: 1 }, { id: 3 }],
      geojson: { type: 'FeatureCollection', features: [{ properties: { id: 1 } }, { properties: { id: 3 } }] }
    };
    const featureMap = new Map();
    const geoMap = new Map();
    for (const t of [tile1, tile2]) {
      for (const f of t.features) featureMap.set(f.id, f);
      for (const gf of t.geojson.features) geoMap.set(gf.properties.id, gf);
    }
    expect(featureMap.size).toBe(3);
    expect(geoMap.size).toBe(3);
  });
});
