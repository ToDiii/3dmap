import { get } from 'svelte/store';
import type { M2MProject } from '../types/map2model';
import { modelConfigStore } from '$lib/stores/modelConfigStore';
import { shapeStore } from '$lib/stores/shapeStore';
import { pathStore } from '$lib/stores/pathStore';
import { pathStyleStore } from '$lib/stores/pathStyleStore';
import { colorPalette } from '$lib/stores/colorPalette';
import { uiConfigStore } from '$lib/stores/uiConfigStore';
import { mapStore } from '$lib/stores/map';
import { invalidateModel } from '$lib/stores/modelStore';
import { applyCustomOverrides } from '$lib/model/widths';

export function parseM2M(json: unknown): M2MProject {
	if (!json || typeof json !== 'object') throw new Error('Invalid project');
	const proj = json as any;
	if (!proj.generatorOptions || typeof proj.generatorOptions !== 'object') {
		throw new Error('Missing generatorOptions');
	}
	return proj as M2MProject;
}

export async function applyM2M(project: M2MProject): Promise<void> {
	const g = project.generatorOptions;
        modelConfigStore.update((cfg) => ({
                ...cfg,
                buildingMultiplier: g.buildingScaleFactor,
                elements: {
                        buildings: g.buildingsEnabled,
                        roads: g.roadEnabled,
                        water: g.waterEnabled,
                        green: g.greeneryEnabled,
                },
                excludeSmallBuildings: g.minBuildingAreaM2 > 0,
                minBuildingArea: g.minBuildingAreaM2,
                minBuildingHeightMM: g.minBuildingHeightMM,
                cropMapToBounds: g.cropMapToBounds,
                waterHeightMM: g.waterHeightMM,
                greeneryHeightMM: g.greeneryHeightMM,
                beachHeightMM: g.beachHeightMM,
                pierHeightMM: g.pierHeightMM,
                minWaterAreaM2: g.minWaterAreaM2,
                footpathRoadsEnabled: g.footpathRoadsEnabled,
                oceanEnabled: g.oceanEnabled,
                beachEnabled: g.beachEnabled,
                piersEnabled: g.piersEnabled,
        }));

	uiConfigStore.update((cfg) => ({
		...cfg,
		baseLayerMM: g.baseLayerMM,
		frame: {
			enabled: g.frameEnabled,
			heightMM: g.frameHeightMM,
			thicknessMM: g.frameThicknessMM,
		},
	}));

	colorPalette.update((p) => ({
		...p,
		road: g.roadColor,
		water: g.waterColor,
		greenery: g.greeneryColor,
		building: g.buildingColor,
		sand: g.sandColor,
		pier: g.pierColor,
		base: g.baseColor,
	}));

	if (project.areaPolygon) {
		shapeStore.set(project.areaPolygon);
		const coords = project.areaPolygon.coordinates[0];
		let minX = coords[0][0],
			minY = coords[0][1],
			maxX = coords[0][0],
			maxY = coords[0][1];
		for (const [x, y] of coords) {
			if (x < minX) minX = x;
			if (y < minY) minY = y;
			if (x > maxX) maxX = x;
			if (y > maxY) maxY = y;
		}
		const map = get(mapStore);
		map?.fitBounds(
			[
				[minX, minY],
				[maxX, maxY],
			],
			{ padding: 20 }
		);
	}

	if (g.customRoadWidths || g.customWaterwayWidths) {
		// values expected in meters; Map2Model may provide mm -> conversion if required
		applyCustomOverrides(g.customRoadWidths, g.customWaterwayWidths);
	}

	if (g.gpxPathEnabled && g.gpxPathGeoJSON) {
		pathStore.set(g.gpxPathGeoJSON);
		pathStyleStore.set({
			color: g.gpxPathColor,
			widthMeters: g.gpxPathWidthMeters,
			heightMM: g.gpxPathHeightMM,
		});
	} else {
		pathStore.set(null);
	}

	await invalidateModel();
}
