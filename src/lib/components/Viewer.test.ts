import '@testing-library/jest-dom';
import { render } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

// mock stores used by Viewer
vi.mock('$lib/stores/modelStore', () => {
  return {
    modelStore: writable([]),
    modelLoading: writable(false),
    modelError: writable(null)
  };
});

vi.mock('$lib/stores/modelConfigStore', () => {
  return { modelConfigStore: writable({ scale: 1, baseHeight: 0 }) };
});

vi.mock('$lib/stores/pathStore', () => {
  return { pathStore: writable(null) };
});

// minimal three.js mocks
vi.mock('three', () => {
  class Group {
    children: any[] = [];
    add(obj: any) { this.children.push(obj); }
    clear() { this.children = []; }
    traverse(fn: (o: any) => void) { this.children.forEach(fn); }
  }
  class Mesh extends Group {
    geometry = { dispose() {} };
    material: any = { dispose() {} };
  }
  class Scene extends Group {}
  class PerspectiveCamera { position = { set() {} }; updateProjectionMatrix() {} }
  class WebGLRenderer {
    domElement = document.createElement('canvas');
    setSize() {}
    render() {}
    dispose() {}
  }
  class AmbientLight {}
  class DirectionalLight { position = { set() {} }; }
  class GridHelper extends Group { position: any = { y: 0 }; }
  class Vector3 { x = 0; y = 0; z = 0; length() { return 1; } copy() {} }
  class Box3 { setFromObject() { return this; } getSize() { return new Vector3(); } getBoundingSphere() { return { radius: 1, center: new Vector3() }; } }
  class Sphere {}
  return {
    Group,
    Mesh,
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    GridHelper,
    Vector3,
    Box3,
    Sphere,
    MeshStandardMaterial: class {},
    Shape: class {},
    ExtrudeGeometry: class { rotateX() {} translate() {} },
    CatmullRomCurve3: class {},
    TubeGeometry: class {},
    Vector2: class { equals() { return true; } }
  };
});

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    target = { copy() {} };
    update() {}
    dispose() {}
    constructor() {}
  }
}));

vi.mock('three/examples/jsm/exporters/GLTFExporter.js', () => ({
  GLTFExporter: class { parse(_i: any, fn: (r: any) => void) { fn({}); } }
}));

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  STLExporter: class { parse() { return new DataView(new ArrayBuffer(8)); } }
}));

// imports that use mocks
import Viewer, { __test_getModelGroup } from './Viewer.svelte';
import { modelStore } from '$lib/stores/modelStore';
import { Mesh } from 'three';

describe('Viewer', () => {
  it('builds scene and adds meshes from modelStore', async () => {
    const { container } = render(Viewer);
    expect(container.querySelector('canvas')).toBeInTheDocument();
    modelStore.set([{ mesh: new Mesh(), type: 'building' }]);
    await tick();
    const group = __test_getModelGroup();
    expect(group.children.length).toBe(1);
  });
});

