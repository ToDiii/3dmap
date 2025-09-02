import { describe, it, expect, vi } from 'vitest';
import { unlinkSync, existsSync } from 'fs';

const mock = vi.fn(async () => ({
	geometry: {
		type: 'LineString',
		coordinates: [
			[1, 2],
			[3, 4],
		],
	},
	distanceKm: 1,
	durationMin: 10,
}));
vi.mock('$lib/server/providers/route', () => ({ routeWaypoints: mock }));
if (existsSync('route-cache.json')) unlinkSync('route-cache.json');

const req = (body: any) =>
	new Request('http://localhost', {
		method: 'POST',
		body: JSON.stringify(body),
	});

describe('route api', () => {
	it('validates coords', async () => {
		const { POST } = await import('./+server');
		const res = await POST({ request: req({ coords: [[1, 2]] }) } as any);
		expect(res.status).toBe(400);
	});

	it('returns result', async () => {
		const { POST } = await import('./+server');
		const coords = [
			[1, 2],
			[3, 4],
		];
		const res = await POST({ request: req({ coords }) } as any);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.result.distanceKm).toBe(1);
		expect(mock).toHaveBeenCalledTimes(1);
	});

	it('handles provider errors', async () => {
		mock.mockReset();
		mock.mockRejectedValueOnce({ status: 400, message: 'max waypoints' });
		const { POST } = await import('./+server');
		const coords = [
			[0, 0],
			[1, 1],
			[2, 2],
		];
		const res = await POST({ request: req({ coords }) } as any);
		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data.error).toContain('max');
	});
});
