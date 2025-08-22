import { writable } from 'svelte/store';

export interface LayerState {
  buildings3d: boolean;
  water: boolean;
  green: boolean;
  roads: boolean;
}

const defaultState: LayerState = {
  buildings3d: true,
  water: true,
  green: true,
  roads: true
};

export const layerStore = writable<LayerState>(defaultState);
