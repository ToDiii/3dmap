import { writable } from 'svelte/store';

export interface FrameConfig {
	enabled: boolean;
	heightMM: number;
	thicknessMM: number;
}

export interface UIConfig {
	baseLayerMM: number;
	frame: FrameConfig;
}

const defaultConfig: UIConfig = {
	baseLayerMM: 0,
	frame: { enabled: false, heightMM: 0, thicknessMM: 0 },
};

function createStore() {
	const { subscribe, set, update } = writable<UIConfig>(defaultConfig);
	return { subscribe, set, update, reset: () => set(defaultConfig) };
}

export const uiConfigStore = createStore();
