import '@testing-library/jest-dom';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import PathEditor from './PathEditor.svelte';
import { pathStore } from '$lib/stores/pathStore';
import { mapStore } from '$lib/stores/map';

vi.mock('$app/environment', () => ({ browser: true }));

class MockMap {
  handlers: Record<string, (e: any) => void> = {};
  draw: any = null;
  addControl(ctrl: any) {
    this.draw = ctrl;
  }
  removeControl() {}
  on(event: string, handler: (e: any) => void) {
    this.handlers[event] = handler;
  }
  trigger(event: string, e: any) {
    this.handlers[event]?.(e);
  }
}

class MockDraw {
  features: any[] = [];
  getAll() {
    return { features: this.features };
  }
  delete(id: string) {
    this.features = this.features.filter((f) => f.id !== id);
  }
  deleteAll() {
    this.features = [];
  }
  changeMode(_mode: string) {}
  on() {}
}

vi.mock('maplibre-gl-draw', () => ({ default: MockDraw }));
vi.mock('maplibre-gl-draw/dist/mapbox-gl-draw.css', () => ({}), { virtual: true });

describe('PathEditor', () => {
  it('updates pathStore on draw and delete', async () => {
    const mockMap = new MockMap();
    render(PathEditor);
    mapStore.set(mockMap as any);
    await tick();

    const feature = {
      id: '1',
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }
    };
    mockMap.draw.features = [feature];
    mockMap.trigger('draw.create', { features: [feature] });
    expect(get(pathStore)).toEqual(feature.geometry);

    mockMap.draw.features = [];
    mockMap.trigger('draw.delete', {});
    expect(get(pathStore)).toBeNull();
  });
});

