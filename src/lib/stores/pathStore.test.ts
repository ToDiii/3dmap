import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { pathStore } from './pathStore';

describe('pathStore', () => {
	it('has null as initial value', () => {
		expect(get(pathStore)).toBeNull();
	});

	it('updates subscribers', () => {
		const values: (GeoJSON.LineString | null)[] = [];
		const unsub = pathStore.subscribe((v) => values.push(v));
		const geom: GeoJSON.LineString = {
			type: 'LineString',
			coordinates: [
				[0, 0],
				[1, 1],
			],
		};
		pathStore.set(geom);
		pathStore.set(null);
		unsub();
		expect(values).toEqual([null, geom, null]);
	});
});
