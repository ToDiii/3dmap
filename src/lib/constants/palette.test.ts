import { describe, it, expect } from 'vitest';
import { mapBuildingSubtype, interpolateSlopeColor, SLOPE_GRADIENT } from './palette';

describe('mapBuildingSubtype', () => {
	it('identifies residential buildings', () => {
		expect(mapBuildingSubtype({ building: 'house' })).toBe('building_residential');
	});

	it('identifies commercial buildings via shop', () => {
		expect(mapBuildingSubtype({ building: 'yes', shop: 'bakery' })).toBe('building_commercial');
	});

	it('identifies industrial buildings', () => {
		expect(mapBuildingSubtype({ building: 'warehouse' })).toBe('building_industrial');
	});

	it('defaults to generic', () => {
		expect(mapBuildingSubtype({ building: 'hut' })).toBe('building_generic');
	});
});

describe('interpolateSlopeColor', () => {
	it('returns first color at zero', () => {
		expect(interpolateSlopeColor(0)).toBe(SLOPE_GRADIENT[0].color);
	});

	it('returns exact stop colors', () => {
		expect(interpolateSlopeColor(0.05)).toBe('#ffd166');
		expect(interpolateSlopeColor(0.08)).toBe('#f8961e');
		expect(interpolateSlopeColor(0.12)).toBe('#ef476f');
	});

	it('clamps above max stop', () => {
		expect(interpolateSlopeColor(0.5)).toBe('#ef476f');
	});
});
