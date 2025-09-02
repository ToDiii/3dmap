import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry';

describe('withRetry', () => {
	it('retries on transient errors', async () => {
		let calls = 0;
		const fn = vi.fn(async () => {
			calls++;
			if (calls < 2) throw { status: 503 };
			return 'ok';
		});
		const res = await withRetry(fn, { maxRetries: 2, baseMs: 1 });
		expect(res.result).toBe('ok');
		expect(res.attempts).toBe(2);
	});
});
