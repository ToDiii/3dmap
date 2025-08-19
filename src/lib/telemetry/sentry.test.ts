import { describe, it, expect } from 'vitest';
import { scrubEvent } from './sentry.client';

describe('scrubEvent', () => {
  it('removes query, hash and user info', () => {
    const event: any = {
      request: { url: 'https://example.com/x?token=1#hash' },
      user: { email: 'a@b.com' }
    };
    const res = scrubEvent(event)!;
    expect(res.request?.url).toBe('https://example.com/x');
    expect(res.user).toBeUndefined();
  });
  it('rounds coordinates', () => {
    const event: any = { request: { url: 'https://ex.com/10.12345,5.98765' } };
    const res = scrubEvent(event)!;
    expect(res.request?.url).toBe('https://ex.com/10.12,5.99');
  });
});
