import { describe, expect, it, vi, afterAll } from 'vitest';

const origEnv = { ...process.env };

describe('routeWaypoints', () => {
  it('calls openrouteservice', async () => {
    vi.resetModules();
    process.env.ROUTING_PROVIDER = 'openrouteservice';
    process.env.ROUTING_MAX_WAYPOINTS = '25';
    const { routeWaypoints } = await import('./route');
    const mock = vi.fn(async () => ({
      json: async () => ({
        features: [
          {
            geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] },
            properties: { summary: { distance: 1000, duration: 600 } }
          }
        ]
      })
    } as any));
    vi.stubGlobal('fetch', mock);
    const res = await routeWaypoints([
      [1, 2],
      [3, 4]
    ]);
    expect(res.geometry.coordinates[0]).toEqual([1, 2]);
    expect(res.distanceKm).toBe(1);
    expect(res.durationMin).toBe(10);
  });

  it('throws on waypoint limit', async () => {
    vi.resetModules();
    process.env.ROUTING_PROVIDER = 'osrm';
    process.env.ROUTING_MAX_WAYPOINTS = '2';
    const { routeWaypoints } = await import('./route');
    await expect(routeWaypoints([[0, 0], [1, 1], [2, 2]])).rejects.toThrow();
  });
});

afterAll(() => {
  process.env = origEnv;
});
