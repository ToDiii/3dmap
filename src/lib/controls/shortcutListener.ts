import { get } from 'svelte/store';
import { commandPaletteStore, openPalette } from '$lib/stores/commandPaletteStore';
import { shortcutHelpStore, openHelp } from '$lib/stores/shortcutHelpStore';
import { getShortcuts } from './shortcuts';

function eventToCombo(e: KeyboardEvent): string {
	const parts: string[] = [];
	if (e.ctrlKey || e.metaKey) parts.push('Mod');
	if (e.shiftKey) parts.push('Shift');
	if (e.altKey) parts.push('Alt');
	const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
	parts.push(key);
	return parts.join('+');
}

function shouldIgnore(e: KeyboardEvent): boolean {
	const target = e.target as HTMLElement | null;
	if (!target) return false;
	const tag = (target as HTMLElement).tagName;
	if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
	if (
		(target as HTMLElement).getAttribute &&
		(target as HTMLElement).getAttribute('contenteditable')
	)
		return true;
	return false;
}

export function setupShortcuts() {
	if (typeof window === 'undefined') return () => {};
	const shortcuts = getShortcuts();
	const handler = (e: KeyboardEvent) => {
		if (shouldIgnore(e)) return;
		if (get(commandPaletteStore).open || get(shortcutHelpStore)) {
			return;
		}
		const combo = eventToCombo(e);
		if (combo === 'Mod+K') {
			e.preventDefault();
			openPalette();
			return;
		}
		if (combo === 'Shift+?') {
			e.preventDefault();
			openHelp();
			return;
		}
		const sc = shortcuts.find((s) => s.combo.toLowerCase() === combo.toLowerCase());
		if (sc && (!sc.enabled || sc.enabled())) {
			e.preventDefault();
			sc.run();
		}
	};
	window.addEventListener('keydown', handler);
	return () => window.removeEventListener('keydown', handler);
}
