import { writable } from 'svelte/store';

export interface ColorPalette {
        road: string;
        water: string;
        greenery: string;
        building: string;
        buildingResidential: string;
        buildingCommercial: string;
        buildingIndustrial: string;
        sand: string;
        pier: string;
        base: string;
        frame: string;
}

export const defaultPalette: ColorPalette = {
        road: '#808080',
        water: '#7ec8e3',
        greenery: '#78c27a',
        building: '#6aa7ff',
        buildingResidential: '#6aa7ff',
        buildingCommercial: '#4f7bd9',
        buildingIndustrial: '#7189aa',
        sand: '#f5deb3',
        pier: '#cccccc',
        base: '#ffffff',
        frame: '#000000',
};

export const colorPalette = writable<ColorPalette>(defaultPalette);
