import { describe, expect, it, vi, afterAll } from 'vitest';

const origEnv = { ...process.env };

describe('geocodeAddress', () => {
  it('uses nominatim', async () => {
    vi.resetModules();
    process.env.GEOCODE_PROVIDER = 'nominatim';
    const { geocodeAddress } = await import('./geocode');
    const mock = vi.fn(async () => ({
      json: async () => [
        { lat: '1.1', lon: '2.2', display_name: 'foo' }
      ]
    } as any));
    vi.stubGlobal('fetch', mock);
    const res = await geocodeAddress('test');
    expect(res[0]).toEqual({ lat: 1.1, lon: 2.2, label: 'foo' });
  });

  it('uses mapbox', async () => {
    vi.resetModules();
    process.env.GEOCODE_PROVIDER = 'mapbox';
    const { geocodeAddress } = await import('./geocode');
    const mock = vi.fn(async () => ({
      json: async () => ({ features: [{ center: [2.2, 1.1], place_name: 'bar' }] })
    } as any));
    vi.stubGlobal('fetch', mock);
    const res = await geocodeAddress('x');
    expect(res[0]).toEqual({ lat: 1.1, lon: 2.2, label: 'bar' });
  });
});

afterAll(() => {
  process.env = origEnv;
});
