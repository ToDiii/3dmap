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
  buildingMultiplier: number;
  elements: ModelElements;
  excludeSmallBuildings: boolean;
  minBuildingArea: number;
}

const defaultConfig: ModelConfig = {
  scale: 500,
  baseHeight: 0,
  buildingMultiplier: 1,
  elements: {
    buildings: true,
    roads: true,
    water: true,
    green: true
  },
  excludeSmallBuildings: false,
  minBuildingArea: 50
};

function createModelConfigStore() {
  const { subscribe, set, update } = writable<ModelConfig>(defaultConfig);
  return {
    subscribe,
    set,
    update,
    reset: () => set(defaultConfig)
  };
}

export const modelConfigStore = createModelConfigStore();
