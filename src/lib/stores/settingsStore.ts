import { writable } from 'svelte/store';

interface SettingsState {
  telemetryConsent: boolean;
}

const STORAGE_KEY = 'settings';

function load(): SettingsState {
  if (typeof localStorage === 'undefined') return { telemetryConsent: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      return { telemetryConsent: !!parsed.telemetryConsent };
    }
  } catch {}
  return { telemetryConsent: false };
}

export const settingsStore = writable<SettingsState>(load());

if (typeof localStorage !== 'undefined') {
  settingsStore.subscribe((val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  });
}
