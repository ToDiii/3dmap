import { describe, it, expect } from 'vitest';
import { buildOverpassQuery, convertTo3D } from './+server';

describe('buildOverpassQuery', () => {
  it('builds query with bbox and elements', () => {
    const query = buildOverpassQuery(['buildings', 'roads', 'water'], [1, 2, 3, 4]);
    expect(query).toContain('way["building"](1,2,3,4);relation["building"](1,2,3,4);');
    expect(query).toContain('way["highway"](1,2,3,4);');
    expect(query).toContain('way["natural"="water"](1,2,3,4);relation["natural"="water"](1,2,3,4);');
    expect(query.trim().endsWith('out geom;')).toBe(true);
  });

  it('builds query without bbox', () => {
    const query = buildOverpassQuery(['roads']);
    expect(query).toBe('[out:json][timeout:25];(way["highway"];);out geom;');
  });
});

describe('convertTo3D', () => {
  it('converts elements to features with height and scale', () => {
    const data = {
      elements: [
        {
          id: 1,
          tags: { building: 'yes', height: '10' },
          geometry: [
            { lon: 1, lat: 2 },
            { lon: 1, lat: 3 }
          ]
        }
      ]
    };
    const result = convertTo3D(data, 2, 1, 1.5);
    expect(result.features).toHaveLength(1);
    const f = result.features[0];
    expect(f.type).toBe('building');
    expect(f.height).toBe(10 * 1.5 + 1);
    expect(f.geometry[0]).toEqual([1 * 2, 1, 2 * 2]);
  });
});
