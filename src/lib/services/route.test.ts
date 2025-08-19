import { describe, expect, it, vi } from 'vitest';

describe('routeWaypoints service', () => {
  it('calls api endpoint', async () => {
    vi.resetModules();
    const { routeWaypoints } = await import('./route');
    const mock = vi.fn(async (_url, _opts) => ({
      ok: true,
      json: async () => ({
        result: {
          geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] },
          distanceKm: 1,
          durationMin: 10
        }
      })
    } as any));
    vi.stubGlobal('fetch', mock);
    const res = await routeWaypoints([
      [1, 2],
      [3, 4]
    ]);
    expect(mock).toHaveBeenCalled();
    expect(res.distanceKm).toBe(1);
    expect(res.geometry.coordinates[0]).toEqual([1, 2]);
  });
});
