import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { settingsStore } from './settingsStore';

beforeEach(() => {
  localStorage.clear();
});

describe('settingsStore', () => {
  it('defaults to false', () => {
    const val = get(settingsStore);
    expect(val.telemetryConsent).toBe(false);
  });
  it('persists changes', () => {
    settingsStore.set({ telemetryConsent: true });
    expect(localStorage.getItem('settings')).toBe(
      JSON.stringify({ telemetryConsent: true })
    );
  });
});
