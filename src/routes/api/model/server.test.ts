import { describe, it, expect } from 'vitest';
import { buildOverpassQuery } from '../../../lib/server/overpass';
import { parsePolygon } from '../../../lib/server/polygon';
import { convertTo3D, type Feature } from '../../../lib/utils/convertTo3D';
import * as THREE from 'three';

describe('parsePolygon', () => {
	it('accepts GeoJSON polygon', () => {
		const poly: GeoJSON.Polygon = {
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
		expect(parsePolygon(poly)).toEqual(poly);
	});

	it('accepts coordinate array and closes polygon', () => {
		const coords = [
			[1, 1],
			[2, 1],
			[2, 2],
			[1, 2],
		];
		const parsed = parsePolygon(coords);
		expect(parsed?.coordinates[0]).toEqual([...coords, coords[0]]);
	});

	it('rejects invalid polygon', () => {
		expect(
			parsePolygon([
				[1, 1],
				[2, 2],
				[3, 3],
			])
		).toBeNull();
	});
});

describe('buildOverpassQuery', () => {
	it('builds query with bbox and elements', () => {
		const query = buildOverpassQuery(['buildings', 'roads', 'water', 'green'], [1, 2, 3, 4]);
		expect(query).toContain('way["building"](1,2,3,4);relation["building"](1,2,3,4);');
		expect(query).toContain('way["highway"](1,2,3,4);');
		expect(query).toContain(
			'way["natural"="water"](1,2,3,4);relation["natural"="water"](1,2,3,4);'
		);
		expect(query).toContain('way["leisure"="park"](1,2,3,4);');
		expect(query.trim().endsWith('out geom;')).toBe(true);
	});

	it('builds query without bbox', () => {
		const query = buildOverpassQuery(['roads']);
		expect(query).toBe('[out:json][timeout:25];(way["highway"];);out geom;');
	});

	it('builds query with polygon shape', () => {
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
		const query = buildOverpassQuery(['buildings'], undefined, shape);
		expect(query).toContain('poly:"1 1 1 2 2 2 2 1 1 1"');
		expect(query).toContain('way["building"]');
	});
});

describe('convertTo3D', () => {
	it('creates extruded meshes from features', () => {
		const features: Feature[] = [
			{
				geometry: [
					[0, 0, 0],
					[0, 10, 0],
					[10, 10, 0],
					[10, 0, 0],
					[0, 0, 0],
				],
				height: 5,
				type: 'building',
			},
		];
		const meshes = convertTo3D(features, 0);
		expect(meshes).toHaveLength(1);
		const mesh = meshes[0].mesh as THREE.Mesh;
		expect(mesh.geometry instanceof THREE.ExtrudeGeometry).toBe(true);
	});
});
