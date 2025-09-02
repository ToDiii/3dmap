import { writable } from 'svelte/store';

export interface PathStyle {
	color: string;
	widthMeters: number;
	heightMM: number;
}

const defaultStyle: PathStyle = { color: '#ff524f', widthMeters: 0, heightMM: 0 };

export const pathStyleStore = writable<PathStyle>(defaultStyle);
