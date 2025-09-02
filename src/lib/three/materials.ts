import * as THREE from 'three';
import { get } from 'svelte/store';
import { colorPalette } from '$lib/stores/colorPalette';

let palette = get(colorPalette);
const buildingMaterials: Record<string, THREE.MeshStandardMaterial> = {};

export const basicMaterials: Record<string, THREE.MeshStandardMaterial> = {
	road: new THREE.MeshStandardMaterial({ color: palette.road }),
	water: new THREE.MeshStandardMaterial({ color: palette.water }),
	green: new THREE.MeshStandardMaterial({ color: palette.greenery }),
};

colorPalette.subscribe((p) => {
	palette = p;
	disposeBuildingMaterials();
	basicMaterials.road.color.set(p.road);
	basicMaterials.water.color.set(p.water);
	basicMaterials.green.color.set(p.greenery);
});

export function getBuildingMaterial(_subtype: string) {
	const key = 'building';
	if (!buildingMaterials[key]) {
		buildingMaterials[key] = new THREE.MeshStandardMaterial({ color: palette.building });
	}
	return buildingMaterials[key];
}

export function disposeBuildingMaterials() {
	for (const m of Object.values(buildingMaterials)) m.dispose();
	for (const k of Object.keys(buildingMaterials)) delete buildingMaterials[k];
}
