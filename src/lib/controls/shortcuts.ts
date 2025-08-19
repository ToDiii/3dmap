import { get } from 'svelte/store';
import { viewModeStore } from '$lib/stores/viewModeStore';
import { layerStore } from '$lib/stores/layerStore';
import { extrudeGroupStore } from '$lib/stores/extrudeGroupStore';
import { modelStore } from '$lib/stores/modelStore';
import { resetProject } from '$lib/utils/projectIO';
import { collectCurrentState } from '$lib/state/bridge';
import { serialize } from '$lib/state/serialize';
import { writeToUrl } from '$lib/state/url';

export interface Shortcut {
  id: string;
  title: string;
  combo: string;
  run: () => void;
  group: string;
  description?: string;
  enabled?: () => boolean;
  when?: () => boolean;
}

let registry: Shortcut[] | null = null;

function buildRegistry(): Shortcut[] {
  const shortcuts: Shortcut[] = [
    {
      id: 'openCommandPalette',
      title: 'Command Palette',
      combo: 'Mod+K',
      group: 'Allgemein',
      run: () => window.dispatchEvent(new CustomEvent('shortcut:commandPalette'))
    },
    {
      id: 'openShortcutHelp',
      title: 'Tastatur-Hilfe',
      combo: 'Shift+?',
      group: 'Allgemein',
      run: () => window.dispatchEvent(new CustomEvent('shortcut:help'))
    },
    {
      id: 'toggleView',
      title: 'Map/Viewer wechseln',
      combo: 'Mod+V',
      group: 'Ansicht',
      run: () => viewModeStore.update((m) => (m === 'map' ? 'viewer' : 'map'))
    },
    {
      id: 'drawRectangle',
      title: 'Rechteck zeichnen',
      combo: 'Mod+Shift+R',
      group: 'Zeichnen',
      run: () => window.dispatchEvent(new CustomEvent('shortcut:draw', { detail: 'rectangle' }))
    },
    {
      id: 'drawCircle',
      title: 'Kreis zeichnen',
      combo: 'Mod+Shift+C',
      group: 'Zeichnen',
      run: () => window.dispatchEvent(new CustomEvent('shortcut:draw', { detail: 'circle' }))
    },
    {
      id: 'drawPolygon',
      title: 'Polygon zeichnen',
      combo: 'Mod+Shift+P',
      group: 'Zeichnen',
      run: () => window.dispatchEvent(new CustomEvent('shortcut:draw', { detail: 'polygon' }))
    },
    {
      id: 'openRoutePlanner',
      title: 'Route Planner öffnen',
      combo: 'Mod+R',
      group: 'Modell',
      run: () => window.dispatchEvent(new CustomEvent('shortcut:routePlanner'))
    },
    ...Array.from({ length: 5 }, (_, i) => {
      const n = i + 1;
      return {
        id: `focusWaypoint${n}`,
        title: `Wegpunkt ${n} fokussieren`,
        combo: `Mod+${n}`,
        group: 'Routing',
        run: () => window.dispatchEvent(new CustomEvent('shortcut:focusWaypoint', { detail: n }))
      } as Shortcut;
    }),
    {
      id: 'toggleLayer.buildings3d',
      title: 'Gebäude-Layer umschalten',
      combo: 'Alt+B',
      group: 'Layer',
      run: () => layerStore.update((s) => ({ ...s, buildings3d: !s.buildings3d }))
    },
    {
      id: 'toggleLayer.water',
      title: 'Wasser-Layer umschalten',
      combo: 'Alt+W',
      group: 'Layer',
      run: () => layerStore.update((s) => ({ ...s, water: !s.water }))
    },
    {
      id: 'toggleLayer.green',
      title: 'Grünflächen-Layer umschalten',
      combo: 'Alt+G',
      group: 'Layer',
      run: () => layerStore.update((s) => ({ ...s, green: !s.green }))
    },
    {
      id: 'export.glb',
      title: 'Export als GLB',
      combo: 'Mod+Shift+B',
      group: 'Export',
      enabled: () => get(modelStore).length > 0,
      run: () => window.dispatchEvent(new CustomEvent('shortcut:export', { detail: 'glb' }))
    },
    {
      id: 'export.gltf',
      title: 'Export als GLTF',
      combo: 'Mod+Shift+G',
      group: 'Export',
      enabled: () => get(modelStore).length > 0,
      run: () => window.dispatchEvent(new CustomEvent('shortcut:export', { detail: 'gltf' }))
    },
    {
      id: 'export.stl',
      title: 'Export als STL',
      combo: 'Mod+Shift+S',
      group: 'Export',
      enabled: () => get(extrudeGroupStore) !== null,
      run: () => window.dispatchEvent(new CustomEvent('shortcut:export', { detail: 'stl' }))
    },
    {
      id: 'export.gpx',
      title: 'Route als GPX exportieren',
      combo: 'Mod+Shift+X',
      group: 'Export',
      run: () => window.dispatchEvent(new CustomEvent('shortcut:export', { detail: 'gpx' }))
    },
    {
      id: 'fitToModel',
      title: 'Auf Modell zentrieren',
      combo: 'Mod+F',
      group: 'Ansicht',
      run: () => window.dispatchEvent(new CustomEvent('shortcut:fit'))
    },
    {
      id: 'resetProject',
      title: 'Projekt zurücksetzen',
      combo: 'Mod+Shift+0',
      group: 'Projekt',
      run: () => resetProject()
    },
    {
      id: 'copyShareLink',
      title: 'Link teilen',
      combo: 'Mod+Shift+L',
      group: 'Projekt',
      run: async () => {
        const s = serialize(collectCurrentState());
        writeToUrl(s, true);
        await navigator.clipboard.writeText(location.href);
      }
    }
  ];

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('shortcuts.user.json');
      if (raw) {
        const overrides = JSON.parse(raw);
        for (const sc of shortcuts) {
          if (overrides[sc.id]) sc.combo = overrides[sc.id];
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load shortcut overrides', e);
  }

  const combos = new Map<string, string>();
  for (const sc of shortcuts) {
    const key = sc.combo.toLowerCase();
    if (combos.has(key)) {
      console.warn(`Shortcut-Konflikt: ${sc.combo} wird bereits von ${combos.get(key)} verwendet`);
    } else {
      combos.set(key, sc.id);
    }
  }

  return shortcuts;
}

export function getShortcuts(): Shortcut[] {
  if (!registry) registry = buildRegistry();
  return registry;
}

export function filterShortcuts(query: string): Shortcut[] {
  const q = query.toLowerCase();
  return getShortcuts().filter((s) =>
    s.title.toLowerCase().startsWith(q) && (s.enabled ? s.enabled() : true)
  );
}

