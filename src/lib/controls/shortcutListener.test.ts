import { describe, it, expect, vi } from 'vitest';
import { setupShortcuts } from './shortcutListener';
import { getShortcuts } from './shortcuts';

describe('shortcut listener', () => {
  it('ignores key events from inputs', () => {
    const sc = getShortcuts().find((s) => s.id === 'toggleView')!;
    const spy = vi.spyOn(sc, 'run');
    const cleanup = setupShortcuts();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
    cleanup();
  });

  it('executes actions for shortcuts', () => {
    const sc = getShortcuts().find((s) => s.id === 'toggleView')!;
    const spy = vi.spyOn(sc, 'run');
    const cleanup = setupShortcuts();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
    expect(spy).toHaveBeenCalled();
    cleanup();
  });
});
