import { writable } from 'svelte/store';

// Stores bounding box as [south, west, north, east]
export const bboxStore = writable<[number, number, number, number] | null>(null);
