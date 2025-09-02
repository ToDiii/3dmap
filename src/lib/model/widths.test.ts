import { describe, it, expect } from 'vitest';
import { getRoadWidthMeters, getWaterwayWidthMeters, applyCustomOverrides } from './widths';

describe('width helpers', () => {
	it('returns default widths', () => {
		expect(getRoadWidthMeters({ highway: 'motorway' })).toBe(25);
		expect(getRoadWidthMeters({ highway: 'residential' })).toBe(6);
		expect(getWaterwayWidthMeters({ waterway: 'river' })).toBe(20);
		expect(getWaterwayWidthMeters({ waterway: 'stream' })).toBe(4);
	});

	it('applies custom overrides', () => {
		applyCustomOverrides({ residential: 8 }, { stream: 5 });
		expect(getRoadWidthMeters({ highway: 'residential' })).toBe(8);
		expect(getWaterwayWidthMeters({ waterway: 'stream' })).toBe(5);
	});
});
