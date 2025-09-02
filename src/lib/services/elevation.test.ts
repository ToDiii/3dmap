import { describe, it, expect, vi } from 'vitest';
import type { LineString } from 'geojson';

const coords: Array<[number, number]> = [
	[0, 0],
	[0.01, 0.01],
	[0.02, 0.02],
	[0.03, 0.03],
	[0.04, 0.04],
];

describe('sampleElevation batching', () => {
	it('batches requests', async () => {
		process.env.ELEVATION_PROVIDER = 'open-elevation';
		process.env.ELEVATION_BATCH_SIZE = '2';
		const responses = [0, 1, 2, 3, 4];
		const fetchMock = vi.fn((_url, opts: any) => {
			const body = JSON.parse(opts.body);
			const res = body.locations.map((_: any, _i: number) => ({
				elevation: responses.shift(),
			}));
			return Promise.resolve(new Response(JSON.stringify({ results: res }), { status: 200 }));
		});
		vi.stubGlobal('fetch', fetchMock);
		const { sampleElevation } = await import('./elevation');
		const res = await sampleElevation(coords);
		expect(res).toEqual([0, 1, 2, 3, 4]);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});
});

describe('densifyLine', () => {
	it('returns target sample count with monotonic distance', async () => {
		const line: LineString = {
			type: 'LineString',
			coordinates: [
				[0, 0],
				[0, 0.1],
			],
		};
		const { densifyLine } = await import('./elevation');
		const pts = densifyLine(line, 10);
		expect(pts.length).toBe(10);
		const dist = (a: [number, number], b: [number, number]) => {
			const R = 6371000;
			const toRad = (d: number) => (d * Math.PI) / 180;
			const dLat = toRad(b[1] - a[1]);
			const dLon = toRad(b[0] - a[0]);
			const lat1 = toRad(a[1]);
			const lat2 = toRad(b[1]);
			const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
			return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
		};
		let prev = 0;
		for (const p of pts) {
			const d = dist(pts[0], p);
			expect(d).toBeGreaterThanOrEqual(prev);
			prev = d;
		}
	});
});

describe('statsFromElevations', () => {
	it('calculates gain and loss', async () => {
		const { statsFromElevations } = await import('./elevation');
		const stats = statsFromElevations([100, 110, 105, 120]);
		expect(stats.min).toBe(100);
		expect(stats.max).toBe(120);
		expect(Math.round(stats.gain)).toBe(25);
		expect(Math.round(stats.loss)).toBe(5);
	});
});
