import { writable } from 'svelte/store';

export interface ColorPalette {
  road: string;
  water: string;
  greenery: string;
  building: string;
  sand: string;
  pier: string;
  base: string;
  frame: string;
}

const defaultPalette: ColorPalette = {
  road: '#808080',
  water: '#7ec8e3',
  greenery: '#78c27a',
  building: '#6aa7ff',
  sand: '#f5deb3',
  pier: '#cccccc',
  base: '#ffffff',
  frame: '#000000'
};

export const colorPalette = writable<ColorPalette>(defaultPalette);
