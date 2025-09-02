import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { modelConfigStore } from './modelConfigStore';

describe('modelConfigStore', () => {
	it('provides default values', () => {
		expect(get(modelConfigStore)).toEqual({
			scale: 500,
			baseHeight: 0,
			buildingMultiplier: 1,
			elements: { buildings: true, roads: true, water: true, green: true },
			excludeSmallBuildings: false,
			minBuildingArea: 50,
			minBuildingHeightMM: 0,
			cropMapToBounds: false,
		});
	});

	it('reacts to updates and reset', () => {
		modelConfigStore.update((cfg) => ({ ...cfg, baseHeight: 5 }));
		expect(get(modelConfigStore).baseHeight).toBe(5);
		modelConfigStore.reset();
		expect(get(modelConfigStore).baseHeight).toBe(0);
	});
});
