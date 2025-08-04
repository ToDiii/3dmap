import { writable } from 'svelte/store';

export const pathStore = writable<GeoJSON.LineString | null>(null);
