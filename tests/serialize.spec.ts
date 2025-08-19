import { describe, it, expect } from 'vitest';
import { serialize, deserialize } from '$lib/state/serialize';

describe('serialize/deserialize', () => {
  it('roundtrips without SSR import errors', () => {
    const state = {
      v: 1,
      model: { scale: 1000, baseHeight: 0, buildingMultiplier: 1, elementTypes: ['building'] },
      view: { map: { center: [11.5761, 48.1372], zoom: 14 }, mode: 'map' },
      layers: { buildings3d: true, water: true, green: true }
    } as any;
    const s = serialize(state);
    const back = deserialize(s)!;
    expect(back.v).toBe(1);
    expect(back.model.scale).toBe(1000);
  });
});

