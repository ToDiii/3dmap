import { describe, it, expect, vi } from 'vitest';

const mock = vi.fn(async () => [{ lat: 1, lon: 2, label: 'a' }]);
vi.mock('$lib/server/providers/geocode', () => ({ geocodeAddress: mock }));

const req = (body: any) =>
  new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify(body)
  });

describe('geocode api', () => {
  it('caches responses', async () => {
    const { POST } = await import('./+server');
    const q = 'foo' + Math.random();
    const res1 = await POST({ request: req({ q }) } as any);
    expect(res1.status).toBe(200);
    const res2 = await POST({ request: req({ q }) } as any);
    const data2 = await res2.json();
    expect(data2.meta.cache).toBe('hit');
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and returns error format', async () => {
    mock.mockReset();
    mock
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce([{ lat: 1, lon: 2, label: 'a' }]);
    const { POST } = await import('./+server');
    const q = 'bar' + Math.random();
    const res = await POST({ request: req({ q }) } as any);
    const data = await res.json();
    expect(data.meta.attempts).toBe(2);
    mock.mockReset();
    mock.mockRejectedValueOnce({ status: 500 });
    const resErr = await POST({ request: req({ q: 'err' + Math.random() }) } as any);
    expect(resErr.status).toBe(500);
    const errJson = await resErr.json();
    expect(errJson.error).toBeDefined();
  });
});
