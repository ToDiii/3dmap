import { writable } from 'svelte/store';

export const shapeStore = writable<GeoJSON.Polygon | null>(null);
