import { writable } from 'svelte/store';

export type ViewMode = 'map' | 'viewer';

export const viewModeStore = writable<ViewMode>('map');
