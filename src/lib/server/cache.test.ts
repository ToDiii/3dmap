import { describe, it, expect } from 'vitest';
import { createCache } from './cache';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('cache', () => {
  it('expires entries after ttl', async () => {
    const cache = createCache<number>({ ttlMs: 10, maxEntries: 10 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    await sleep(20);
    expect(cache.get('a')).toBeUndefined();
  });

  it('evicts oldest when maxEntries exceeded', () => {
    const cache = createCache<number>({ ttlMs: 1000, maxEntries: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
  });
});
