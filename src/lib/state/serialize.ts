import LZString from 'lz-string';
const {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent
} = LZString;
import type { SceneState } from './schema';
import { STATE_VERSION } from './schema';

export const MAX_STATE_SIZE = 12 * 1024; // 12kB

function canonicalize(state: SceneState): SceneState {
  return JSON.parse(JSON.stringify(state));
}

export function serialize(state: SceneState): string {
  const canonical = canonicalize({ ...state, v: STATE_VERSION });
  const json = JSON.stringify(canonical);
  return compressToEncodedURIComponent(json);
}

export function deserialize(s: string): SceneState | null {
  try {
    const json = decompressFromEncodedURIComponent(s);
    if (!json) return null;
    const obj = JSON.parse(json);
    if (obj.v !== STATE_VERSION) return null;
    return obj as SceneState;
  } catch {
    return null;
  }
}
