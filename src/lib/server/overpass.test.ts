import { describe, expect, it } from 'vitest';
import { buildOverpassQuery, convertTo3D } from './overpass';

describe('buildOverpassQuery', () => {
	it('combines layers with bbox filter', () => {
		const q = buildOverpassQuery(['buildings', 'roads'], [1, 2, 3, 4]);
		expect(q).toContain('way["building"](1,2,3,4);');
		expect(q).toContain('way["highway"](1,2,3,4);');
	});

	it('includes waterway for water elements', () => {
		const q = buildOverpassQuery(['water'], [1, 2, 3, 4]);
		expect(q).toContain('way["waterway"](1,2,3,4);');
	});

	it('uses polygon instead of bbox', () => {
		const shape: GeoJSON.Polygon = {
			type: 'Polygon',
			coordinates: [
				[
					[1, 1],
					[2, 1],
					[2, 2],
					[1, 2],
					[1, 1],
				],
			],
		};
		const q = buildOverpassQuery(['water'], [1, 2, 3, 4], shape);
		expect(q).toContain('poly:"1 1 1 2 2 2 2 1 1 1"');
		expect(q).not.toContain('(1,2,3,4)');
	});
});

describe('convertTo3D', () => {
	it('creates features with types and heights', () => {
		const data = {
			elements: [
				{
					id: 1,
					geometry: [
						{ lon: 0, lat: 0 },
						{ lon: 0, lat: 1 },
						{ lon: 1, lat: 1 },
						{ lon: 1, lat: 0 },
					],
					tags: { building: 'residential', 'building:levels': '2' },
				},
				{
					id: 2,
					geometry: [
						{ lon: 0, lat: 0 },
						{ lon: 1, lat: 0 },
					],
					tags: { highway: 'residential' },
				},
				{
					id: 3,
					geometry: [
						{ lon: 0, lat: 0 },
						{ lon: 0, lat: 1 },
						{ lon: 1, lat: 1 },
						{ lon: 1, lat: 0 },
					],
					tags: { natural: 'water' },
				},
				{
					id: 4,
					geometry: [
						{ lon: 0, lat: 0 },
						{ lon: 0, lat: 1 },
						{ lon: 1, lat: 1 },
						{ lon: 1, lat: 0 },
					],
					tags: { leisure: 'park' },
				},
			],
		};
		const res = convertTo3D(data, 100, 1, 2);
		const features = res.features;
		expect(features).toHaveLength(4);
		const building = features.find((f) => f.type === 'building');
		expect(building?.height).toBe(13); // (2 levels *3)*2 + baseHeight(1)
		expect(building?.subtype).toBe('building_residential');
		const road = features.find((f) => f.type === 'road');
		expect(road).toBeTruthy();
		const water = features.filter((f) => f.type === 'water');
		expect(water.length).toBe(1); // only natural water, not waterway in sample
		const green = features.find((f) => f.type === 'green');
		expect(green).toBeTruthy();

		// GeoJSON output
		expect(res.geojson.features).toHaveLength(4); // building, road, water, green
		const bGeo = res.geojson.features.find((f) => f.properties?.featureType === 'building');
		expect(bGeo?.properties?.height_final).toBe(13);
		expect((bGeo?.properties as any)?.subtype).toBe('building_residential');
		const rGeo = res.geojson.features.find((f) => f.properties?.featureType === 'road');
		expect((rGeo?.properties as any)?.width_m).toBeDefined();
		expect((rGeo?.properties as any)?.area_m2).toBeGreaterThan(0);
	});

	it('filters buildings by min area', () => {
		const small = {
			id: 5,
			geometry: [
				{ lon: 0, lat: 0 },
				{ lon: 0, lat: 0.0001 },
				{ lon: 0.0001, lat: 0.0001 },
				{ lon: 0.0001, lat: 0 },
			],
			tags: { building: 'yes' },
		};
		const res = convertTo3D({ elements: [small] }, 100, 0, 1, 1_000_000);
		expect(res.features).toHaveLength(0);
		expect(res.geojson.features).toHaveLength(0);
	});

	it('applies minimum building height', () => {
		const b = {
			id: 10,
			geometry: [
				{ lon: 0, lat: 0 },
				{ lon: 0, lat: 1 },
				{ lon: 1, lat: 1 },
				{ lon: 1, lat: 0 },
			],
			tags: { building: 'yes', height: '0' },
		};
		const res = convertTo3D({ elements: [b] }, 100, 0, 1, 0, undefined, 5);
		expect(res.features[0].height).toBeCloseTo(0.005, 3);
	});

	it('clips buildings outside polygon', () => {
		const b = {
			id: 11,
			geometry: [
				{ lon: 2, lat: 2 },
				{ lon: 2, lat: 3 },
				{ lon: 3, lat: 3 },
				{ lon: 3, lat: 2 },
			],
			tags: { building: 'yes', height: '0' },
		};
		const clip: GeoJSON.Polygon = {
			type: 'Polygon',
			coordinates: [
				[
					[0, 0],
					[0, 1],
					[1, 1],
					[1, 0],
					[0, 0],
				],
			],
		};
		const res = convertTo3D({ elements: [b] }, 100, 0, 1, 0, clip, 5);
		expect(res.features).toHaveLength(0);
	});
});
