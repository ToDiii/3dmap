import { writable } from 'svelte/store';

export interface ModelElements {
  buildings: boolean;
  roads: boolean;
  water: boolean;
  green: boolean;
}

export interface ModelConfig {
  scale: number;
  baseHeight: number;
  buildingHeightMultiplier: number;
  elements: ModelElements;
}

export const modelConfigStore = writable<ModelConfig>({
  scale: 500,
  baseHeight: 0,
  buildingHeightMultiplier: 1,
  elements: {
    buildings: true,
    roads: true,
    water: true,
    green: true
  }
});
