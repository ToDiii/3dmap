import * as THREE from 'three';
import { COLORS } from '$lib/constants/palette';

const buildingMaterials: Record<string, THREE.MeshStandardMaterial> = {};

export function getBuildingMaterial(subtype: string) {
  const key = subtype in COLORS ? subtype : 'building_residential';
  if (!buildingMaterials[key]) {
    const color = (COLORS as any)[key] || COLORS.building_residential;
    buildingMaterials[key] = new THREE.MeshStandardMaterial({ color });
  }
  return buildingMaterials[key];
}

export function disposeBuildingMaterials() {
  for (const m of Object.values(buildingMaterials)) m.dispose();
  for (const k of Object.keys(buildingMaterials)) delete buildingMaterials[k];
}

export const basicMaterials: Record<string, THREE.Material> = {
  road: new THREE.MeshStandardMaterial({ color: 0x808080 }),
  water: new THREE.MeshStandardMaterial({ color: COLORS.water }),
  green: new THREE.MeshStandardMaterial({ color: COLORS.green })
};
