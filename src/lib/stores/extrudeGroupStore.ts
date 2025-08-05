import { writable } from 'svelte/store';
import type { Group } from 'three';

export const extrudeGroupStore = writable<Group | null>(null);
