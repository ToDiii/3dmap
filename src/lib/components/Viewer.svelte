<script lang="ts">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
  import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
  import { onMount } from 'svelte';
  import { modelConfigStore } from '$lib/stores/modelConfigStore';
  import { pathStore } from '$lib/stores/pathStore';
  import { modelStore, modelLoading, modelError } from '$lib/stores/modelStore';
  import type { MeshFeature } from '$lib/utils/convertTo3D';

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
  let currentScale = 1;
  let currentBaseHeight = 0;
  let path: GeoJSON.LineString | null = null;
  let isLoading = false;

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
    if (modelGroup.children.length === 0) {
      exportMessage = 'Kein exportierbares Modell gefunden';
      setTimeout(() => (exportMessage = null), 2000);
      return;
    }
    const exporter = new GLTFExporter();
    exporter.parse(
      modelGroup,
      (result) => {
        const timestamp = new Date().toISOString().split('T')[0];
        let blob: Blob;
        let filename: string;
        if (binary) {
          blob = new Blob([result as ArrayBuffer], {
            type: 'model/gltf-binary'
          });
          filename = `modell_export_${timestamp}.glb`;
        } else {
          const json = JSON.stringify(result, null, 2);
          blob = new Blob([json], { type: 'model/gltf+json' });
          filename = `modell_export_${timestamp}.gltf`;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        exportMessage = 'Datei wurde heruntergeladen';
        setTimeout(() => (exportMessage = null), 2000);
      },
      (err) => console.error('export failed', err),
      { binary }
    );
  }

  function exportSTL() {
    buildPathGeometry(path, currentBaseHeight, currentScale);
    if (modelGroup.children.length === 0) {
      exportMessage = 'Kein exportierbares Modell gefunden';
      setTimeout(() => (exportMessage = null), 2000);
      return;
    }
    const exporter = new STLExporter();
    const result = exporter.parse(modelGroup, { binary: true }) as DataView;
    const buffer = result.buffer as ArrayBuffer;
    const blob = new Blob([buffer], { type: 'model/stl' });
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `modell_export_${timestamp}.stl`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    exportMessage = 'Datei wurde heruntergeladen';
    setTimeout(() => (exportMessage = null), 2000);
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

  const materials: Record<string, THREE.Material> = {
    building: new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    road: new THREE.MeshStandardMaterial({ color: 0x808080 }),
    water: new THREE.MeshStandardMaterial({ color: 0x3399ff })
  };

  function updateScene(meshes: MeshFeature[], baseHeight: number, scale: number) {
    clearGroup(modelGroup);
    currentScale = scale;
    currentBaseHeight = baseHeight;
    if (ground) {
      scene.remove(ground);
      ground = undefined;
    }
    if (!meshes || meshes.length === 0) {
      loadError = 'Keine Features geladen';
      return;
    }
    for (const { mesh, type } of meshes) {
      mesh.material = materials[type];
      modelGroup.add(mesh);
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
    loadError = null;
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

    const unsubCfg = modelConfigStore.subscribe((cfg) => {
      currentScale = cfg.scale;
      currentBaseHeight = cfg.baseHeight;
    });
    const unsubModel = modelStore.subscribe((meshes) => {
      updateScene(meshes, currentBaseHeight, currentScale);
    });
    const unsubLoading = modelLoading.subscribe((v) => (isLoading = v));
    const unsubError = modelError.subscribe((v) => (loadError = v));
    const unsubPath = pathStore.subscribe((v) => {
      path = v;
      buildPathGeometry(path, currentBaseHeight, currentScale);
    });

    window.addEventListener('resize', onResize);
    animate();

    return () => {
      unsubCfg();
      unsubModel();
      unsubLoading();
      unsubError();
      unsubPath();
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
    };
  });
</script>

<div class="relative w-full h-full">
  <div bind:this={container} class="w-full h-full"></div>
  {#if isLoading}
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  {/if}
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
      <button
        class="px-2 py-1 bg-purple-600 text-white text-sm rounded"
        on:click={exportSTL}
      >
        STL exportieren
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
  </div>
</div>

