<script lang="ts">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
  import { onMount } from 'svelte';
  import { modelConfigStore } from '$lib/stores/modelConfigStore';
  import type { ModelConfig } from '$lib/stores/modelConfigStore';
  import { bboxStore } from '$lib/stores/bboxStore';
  import { pathStore } from '$lib/stores/pathStore';
  import { get } from 'svelte/store';

  let container: HTMLDivElement;
  let renderer: THREE.WebGLRenderer;
  let camera: THREE.PerspectiveCamera;
  let scene: THREE.Scene;
  let controls: OrbitControls;
  let modelGroup: THREE.Group = new THREE.Group();
  let pathGroup: THREE.Group = new THREE.Group();
  let ground: THREE.Object3D | undefined;
  let exportMessage: string | null = null;
  let loadError: string | null = null;
  let bbox: [number, number, number, number] | null = null;
  let currentScale = 1;
  let currentBaseHeight = 0;
  let path: GeoJSON.LineString | null = null;
  let debugInfo: any = null;

  function buildPathGeometry(
    p: GeoJSON.LineString | null,
    baseHeight: number,
    scale: number
  ) {
    clearGroup(pathGroup);
    if (!p || p.coordinates.length < 2) return;
    const pts = p.coordinates.map(
      ([lon, lat]) => new THREE.Vector3(lon * scale, baseHeight + 0.1, lat * scale)
    );
    const curve = new THREE.CatmullRomCurve3(pts);
    const geom = new THREE.TubeGeometry(curve, Math.max(2, pts.length * 3), 0.5, 8, false);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geom, mat);
    pathGroup.add(mesh);
    if (!modelGroup.children.includes(pathGroup)) {
      modelGroup.add(pathGroup);
    }
  }

  function exportModel(binary = false) {
    buildPathGeometry(path, currentBaseHeight, currentScale);
    const exporter = new GLTFExporter();
    exporter.parse(
      modelGroup,
      (result) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let blob: Blob;
        let filename: string;
        if (binary) {
          blob = new Blob([result as ArrayBuffer], {
            type: 'model/gltf-binary'
          });
          filename = `modell_${timestamp}.glb`;
        } else {
          const json = JSON.stringify(result, null, 2);
          blob = new Blob([json], { type: 'model/gltf+json' });
          filename = `modell_${timestamp}.gltf`;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        exportMessage = `${binary ? 'GLB' : 'GLTF'} exportiert`;
        setTimeout(() => (exportMessage = null), 2000);
      },
      (err) => console.error('export failed', err),
      { binary }
    );
  }

  async function loadModel(cfg: ModelConfig) {
    try {
      const elements = Object.entries(cfg.elements)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const res = await fetch('/api/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scale: cfg.scale,
          baseHeight: cfg.baseHeight,
          buildingMultiplier: cfg.buildingHeightMultiplier,
          elements,
          bbox: bbox || undefined
        })
      });
      const data = await res.json();
      console.log('BBox:', bbox, 'API Response:', data);
      debugInfo = { bbox, response: data };
      loadError = buildScene(data.features, cfg.baseHeight, cfg.scale);
    } catch (err) {
      console.error('failed to load model', err);
      loadError = 'Modell konnte nicht geladen werden';
    }
  }

  function clearGroup(group: THREE.Group) {
    group.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          (obj.material as THREE.Material).dispose();
        }
      }
    });
    group.clear();
  }

  interface Feature {
    geometry: [number, number, number][];
    height: number;
    type: 'building' | 'road' | 'water';
  }

  function buildScene(
    features: Feature[],
    baseHeight: number,
    scale: number
  ): string | null {
    clearGroup(modelGroup);
    currentScale = scale;
    currentBaseHeight = baseHeight;
    if (ground) {
      scene.remove(ground);
      ground = undefined;
    }

    if (!features || features.length === 0) {
      return 'Keine Features geladen';
    }

    const geoms: Record<string, THREE.BufferGeometry[]> = {
      building: [],
      road: [],
      water: []
    };

    for (const f of features) {
      const pts = f.geometry.map(([x, _y, z]) => new THREE.Vector2(x, z));
      if (pts.length < 3) continue;
      if (!pts[0].equals(pts[pts.length - 1])) pts.push(pts[0]);
      const shape = new THREE.Shape(pts);
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: f.height || 0.1,
        bevelEnabled: false
      });
      geom.rotateX(-Math.PI / 2);
      geom.translate(0, baseHeight, 0);
      geoms[f.type]?.push(geom);
    }

    const materials: Record<string, THREE.Material> = {
      building: new THREE.MeshStandardMaterial({ color: 0xb0b0b0 }),
      road: new THREE.MeshStandardMaterial({ color: 0x666666 }),
      water: new THREE.MeshStandardMaterial({ color: 0x3399ff })
    };

    let added = 0;
    for (const type of Object.keys(geoms)) {
      const g = geoms[type];
      if (!g.length) continue;
      const merged = mergeGeometries(g);
      const mesh = new THREE.Mesh(merged, materials[type]);
      modelGroup.add(mesh);
      added += g.length;
    }

    if (added === 0) {
      return 'Features vorhanden, aber leer';
    }

    const box = new THREE.Box3().setFromObject(modelGroup);
    const size = box.getSize(new THREE.Vector3()).length();
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    if (sphere && isFinite(sphere.radius)) {
      camera.position.set(
        sphere.center.x + sphere.radius * 2,
        sphere.center.y + sphere.radius * 2,
        sphere.center.z + sphere.radius * 2
      );
      controls.target.copy(sphere.center);
      controls.update();
    }

    const gridSize = size || 100;
    const grid = new THREE.GridHelper(gridSize, 20);
    grid.position.y = baseHeight;
    ground = grid;
    scene.add(grid);
    buildPathGeometry(path, baseHeight, scale);
    return null;
  }

  function onResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  onMount(() => {
    scene = new THREE.Scene();
    scene.add(modelGroup);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      10000
    );

    controls = new OrbitControls(camera, renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.5);
    dir.position.set(50, 100, 50);
    scene.add(dir);

    const unsub = modelConfigStore.subscribe((cfg) => loadModel(cfg));
    const unsubBBox = bboxStore.subscribe((v) => {
      bbox = v;
      loadModel(get(modelConfigStore));
    });
    const unsubPath = pathStore.subscribe((v) => {
      path = v;
      buildPathGeometry(path, currentBaseHeight, currentScale);
    });

    window.addEventListener('resize', onResize);
    animate();

    return () => {
      unsub();
      unsubBBox();
      unsubPath();
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
    };
  });
</script>

<div class="relative w-full h-full">
  <div bind:this={container} class="w-full h-full"></div>
  <div class="absolute top-2 left-2 flex flex-col gap-2">
    <div class="flex gap-2">
      <button
        class="px-2 py-1 bg-blue-600 text-white text-sm rounded"
        on:click={() => exportModel(false)}
      >
        GLTF exportieren
      </button>
      <button
        class="px-2 py-1 bg-green-600 text-white text-sm rounded"
        on:click={() => exportModel(true)}
      >
        GLB exportieren
      </button>
      {#if exportMessage}
        <span class="px-2 py-1 text-sm bg-white/80 rounded">
          {exportMessage}
        </span>
      {/if}
    </div>
    {#if loadError}
      <span class="px-2 py-1 text-sm bg-red-600 text-white rounded">{loadError}</span>
    {/if}
    {#if debugInfo}
      <pre class="px-2 py-1 text-xs bg-white/80 rounded max-w-xs overflow-auto">
{JSON.stringify({ bbox: debugInfo.bbox, features: debugInfo.response?.features?.length }, null, 2)}
      </pre>
    {/if}
  </div>
</div>

