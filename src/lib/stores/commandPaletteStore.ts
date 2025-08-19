import { writable } from 'svelte/store';

interface CommandPaletteState {
  open: boolean;
  query: string;
}

const initial: CommandPaletteState = { open: false, query: '' };

export const commandPaletteStore = writable<CommandPaletteState>(initial);

export function openPalette() {
  commandPaletteStore.update((s) => ({ ...s, open: true }));
}

export function closePalette() {
  commandPaletteStore.set({ open: false, query: '' });
}

export function setQuery(q: string) {
  commandPaletteStore.update((s) => ({ ...s, query: q }));
}
