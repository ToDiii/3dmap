import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('$lib/stores/modelStore', () => ({ invalidateModel: vi.fn() }));
import { parseM2M, applyM2M } from './map2model';
import { modelConfigStore } from '$lib/stores/modelConfigStore';
import { uiConfigStore } from '$lib/stores/uiConfigStore';
import { colorPalette, defaultPalette } from '$lib/stores/colorPalette';
import { pathStore } from '$lib/stores/pathStore';
import { pathStyleStore } from '$lib/stores/pathStyleStore';
import type { LineString, Polygon } from 'geojson';
import type { M2MProject } from '../types/map2model';
import { get } from 'svelte/store';

function hexToRgb(hex: string): string {
	const clean = hex.replace('#', '');
	const num = parseInt(clean, 16);
	const r = (num >> 16) & 0xff;
	const g = (num >> 8) & 0xff;
	const b = num & 0xff;
	return `rgb(${r}, ${g}, ${b})`;
}

const baseProjectData = {
	generatorOptions: {
		mapWidthMM: 100,
		baseLayerMM: 2,
		elevationEnabled: false,
		elevationExaggeration: 1,
		roadEnabled: true,
		footpathRoadsEnabled: false,
		customRoadWidths: {},
		waterEnabled: true,
		waterHeightMM: 0,
		minWaterAreaM2: 0,
		customWaterwayWidths: {},
		oceanEnabled: false,
		beachEnabled: false,
		beachHeightMM: 0,
		piersEnabled: false,
		pierHeightMM: 0,
		greeneryEnabled: true,
		greeneryHeightMM: 0,
		buildingsEnabled: true,
		buildingScaleFactor: 1,
		minBuildingHeightMM: 5,
		minBuildingAreaM2: 50,
		gpxPathEnabled: true,
		gpxPathHeightMM: 1,
		gpxPathWidthMeters: 2,
		gpxPathColor: '#ff0000',
		gpxPathGeoJSON: {
			type: 'LineString',
			coordinates: [
				[0, 0],
				[1, 1],
			],
		} as LineString,
		roadColor: '#111',
		waterColor: '#222',
		greeneryColor: '#333',
		buildingColor: '#444',
		sandColor: '#555',
		pierColor: '#666',
		baseColor: '#777',
		frameEnabled: true,
		frameHeightMM: 3,
		frameThicknessMM: 2,
		cropMapToBounds: true,
	},
	areaPolygon: {
		type: 'Polygon',
		coordinates: [
			[
				[0, 0],
				[1, 0],
				[1, 1],
				[0, 1],
				[0, 0],
			],
		],
	} as Polygon,
} as const;

function createProject(overrides: Partial<M2MProject['generatorOptions']> = {}): M2MProject {
	const generatorOptions = structuredClone(baseProjectData.generatorOptions);
	Object.assign(generatorOptions, overrides);
	return parseM2M({
		generatorOptions,
		areaPolygon: structuredClone(baseProjectData.areaPolygon),
	});
}

beforeEach(() => {
	colorPalette.set(defaultPalette);
	pathStore.set(null);
	pathStyleStore.set({ color: '#ff524f', widthMeters: 0, heightMM: 0 });
});

describe('map2model importer', () => {
	it('maps generator options to stores', async () => {
		const proj = createProject();
		await applyM2M(proj);
		expect(get(modelConfigStore).minBuildingHeightMM).toBe(5);
		expect(get(modelConfigStore).cropMapToBounds).toBe(true);
		expect(get(modelConfigStore).waterHeightMM).toBe(0);
		expect(get(modelConfigStore).greeneryHeightMM).toBe(0);
		expect(get(modelConfigStore).beachHeightMM).toBe(0);
		expect(get(modelConfigStore).pierHeightMM).toBe(0);
		expect(get(modelConfigStore).minWaterAreaM2).toBe(0);
		expect(get(modelConfigStore).footpathRoadsEnabled).toBe(false);
		expect(get(modelConfigStore).oceanEnabled).toBe(false);
		expect(get(modelConfigStore).beachEnabled).toBe(false);
		expect(get(modelConfigStore).piersEnabled).toBe(false);
		expect(get(uiConfigStore).baseLayerMM).toBe(2);
		expect(get(uiConfigStore).frame.enabled).toBe(true);
		expect(get(colorPalette).road).toBe('#111');
		expect(get(colorPalette).buildingResidential).toBe('#444');
		expect(get(colorPalette).buildingCommercial).toBe('#444');
		expect(get(colorPalette).buildingIndustrial).toBe('#444');
		expect(get(pathStore)).toEqual(proj.generatorOptions.gpxPathGeoJSON);
		expect(get(pathStyleStore).widthMeters).toBe(2);
	});

	it('updates legend colors after importing a palette', async () => {
		const container = document.createElement('div');
		const swatchKeys = [
			'buildingResidential',
			'buildingCommercial',
			'buildingIndustrial',
			'water',
			'greenery',
		] as const;
		const swatches = swatchKeys.map(() => {
			const span = document.createElement('span');
			span.className = 'h-4 w-4';
			container.appendChild(span);
			return span;
		});

		const unsubscribe = colorPalette.subscribe((palette) => {
			swatches[0].style.background = palette.buildingResidential;
			swatches[1].style.background = palette.buildingCommercial;
			swatches[2].style.background = palette.buildingIndustrial;
			swatches[3].style.background = palette.water;
			swatches[4].style.background = palette.greenery;
		});

		const readSwatchStyles = () => swatches.map((el) => el.getAttribute('style') ?? '');

		const initialStyles = readSwatchStyles();
		expect(initialStyles).toHaveLength(5);
		expect(initialStyles[0]).toContain(hexToRgb(defaultPalette.buildingResidential));
		expect(initialStyles[3]).toContain(hexToRgb(defaultPalette.water));

		const proj = createProject({
			roadColor: '#010101',
			waterColor: '#020202',
			greeneryColor: '#030303',
			buildingColor: '#040404',
			sandColor: '#050505',
			pierColor: '#060606',
			baseColor: '#070707',
		});
		await applyM2M(proj);

		const updatedStyles = readSwatchStyles();
		expect(updatedStyles[0]).toContain(hexToRgb('#040404'));
		expect(updatedStyles[1]).toContain(hexToRgb('#040404'));
		expect(updatedStyles[2]).toContain(hexToRgb('#040404'));
		expect(updatedStyles[3]).toContain(hexToRgb('#020202'));
		expect(updatedStyles[4]).toContain(hexToRgb('#030303'));

		unsubscribe();
	});
});
