import { describe, it, expect, vi } from 'vitest';

describe('rate limiter', () => {
	it('blocks after limit', async () => {
		vi.resetModules();
		process.env.API_RATE_LIMIT_PER_MIN = '2';
		const { allowRequest } = await import('./rate');
		expect(allowRequest('geocode')).toBe(true);
		expect(allowRequest('geocode')).toBe(true);
		expect(allowRequest('geocode')).toBe(false);
	});
});
