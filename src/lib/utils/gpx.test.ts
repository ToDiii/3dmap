import { describe, expect, it } from 'vitest';
import { lineStringToGpx } from './gpx';

describe('lineStringToGpx', () => {
	it('creates basic gpx', () => {
		const line: GeoJSON.LineString = {
			type: 'LineString',
			coordinates: [
				[1, 2],
				[3, 4],
			],
		};
		const gpx = lineStringToGpx('test', line);
		expect(gpx).toContain('<gpx');
		expect(gpx).toContain('trkpt');
	});
});
