import { describe, expect, it, vi } from 'vitest';

describe('geocodeAddress service', () => {
  it('calls api endpoint and maps results', async () => {
    vi.resetModules();
    const { geocodeAddress } = await import('./geocode');
    const mock = vi.fn(async (_url, _opts) => ({
      ok: true,
      json: async () => ({ results: [{ lat: 1.1, lon: 2.2, label: 'foo' }] })
    } as any));
    vi.stubGlobal('fetch', mock);
    const res = await geocodeAddress('test');
    expect(mock).toHaveBeenCalled();
    expect(res[0]).toEqual({ lat: 1.1, lon: 2.2, label: 'foo' });
  });
});
