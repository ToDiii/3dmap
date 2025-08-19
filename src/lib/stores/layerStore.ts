import { writable } from 'svelte/store';

export interface LayerState {
  buildings3d: boolean;
  water: boolean;
  green: boolean;
}

const defaultState: LayerState = {
  buildings3d: true,
  water: true,
  green: true
};

export const layerStore = writable<LayerState>(defaultState);
