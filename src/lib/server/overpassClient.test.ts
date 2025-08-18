import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchOverpass, setConfig } from './overpassClient';

beforeEach(() => {
  setConfig({
    endpoints: ['https://a', 'https://b'],
    timeoutMs: 50,
    maxRetries: 1,
    retryBaseMs: 1,
    concurrency: 1,
    userAgent: 'test'
  });
});

describe('overpassClient', () => {
  it('retries and rotates endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ foo: 1 }) });
    // @ts-ignore
    global.fetch = fetchMock;
    const res = await fetchOverpass('X');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://a');
    expect(fetchMock.mock.calls[1][0]).toBe('https://b');
    expect(res.meta.attempts).toBe(2);
  });

  it('dedupes in-flight requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) });
    // @ts-ignore
    global.fetch = fetchMock;
    const p1 = fetchOverpass('Y');
    const p2 = fetchOverpass('Y');
    await Promise.all([p1, p2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 429', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) });
    // @ts-ignore
    global.fetch = fetchMock;
    const res = await fetchOverpass('Z');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.meta.attempts).toBe(2);
  });
});
