import { describe, expect, it } from 'vitest';
import { serialize, deserialize, MAX_STATE_SIZE } from './serialize';
import type { SceneState } from './schema';
import { compressToEncodedURIComponent } from 'lz-string';

describe('state serialization', () => {
  const baseState: SceneState = {
    v: 1,
    model: { scale: 500, baseHeight: 0, buildingMultiplier: 1, elementTypes: ['buildings'] },
    meta: { ts: 1 }
  };

  it('roundtrip', () => {
    const s = serialize(baseState);
    const back = deserialize(s);
    expect(back).toEqual(baseState);
  });

  it('invalid version returns null', () => {
    const bad = compressToEncodedURIComponent(JSON.stringify({ ...baseState, v: 999 }));
    expect(deserialize(bad)).toBeNull();
  });

  it('warn when over size limit', () => {
    const big: SceneState = {
      ...baseState,
      route: {
        waypoints: Array.from({ length: 100000 }, () => ({ a: 'x', c: [0, 0] })),
        line: { type: 'LineString', coordinates: Array.from({ length: 100000 }, () => [0, 0]) }
      }
    };
    const s = serialize(big);
    expect(s.length).toBeGreaterThan(MAX_STATE_SIZE);
  });
});
