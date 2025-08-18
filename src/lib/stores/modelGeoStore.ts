import { writable } from 'svelte/store';
import type { FeatureCollection } from 'geojson';

export const modelGeo = writable<FeatureCollection | null>(null);
