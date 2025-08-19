import { writable } from 'svelte/store';

export const shortcutHelpStore = writable(false);

export function openHelp() {
  shortcutHelpStore.set(true);
}

export function closeHelp() {
  shortcutHelpStore.set(false);
}
