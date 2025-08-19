<script lang="ts">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
    import { mergeBufferGeometries } from '$lib/three/geometry';
  import * as exportSTL from 'threejs-export-stl';
  import { exportTo3MF as export3MF } from 'three-3mf-exporter';
  import { onMount } from 'svelte';
  import { modelConfigStore } from '$lib/stores/modelConfigStore';
  import { pathStore } from '$lib/stores/pathStore';
  import { modelStore, modelLoading, modelError } from '$lib/stores/modelStore';
  import { routeStore } from '$lib/stores/routeStore';
  import type { MeshFeature } from '$lib/utils/convertTo3D';
  import {
    getBuildingMaterial,
    basicMaterials,
    disposeBuildingMaterials
  } from '$lib/three/materials';
  import { interpolateSlopeColor } from '$lib/constants/palette';

  let container: HTMLDivElement;
  let renderer: THREE.WebGLRenderer;
  let camera: THREE.PerspectiveCamera;
  let scene: THREE.Scene;
  let controls: OrbitControls;
  let modelGroup: THREE.Group = new THREE.Group();
  let pathGroup: THREE.Group = new THREE.Group();
  let ground: THREE.Object3D | undefined;
  let toastMessage: string | null = null;
  let loadError: string | null = null;
  let currentScale = 1;
  let currentBaseHeight = 0;
  let path: GeoJSON.LineString | null = null;
  let elevations: number[] | undefined;
  let isLoading = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoverText: string | null = null;

  function haversine(a: [number, number], b: [number, number]): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]);
    const lat2 = toRad(b[1]);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function onPointerMove(event: PointerEvent) {
    if (!renderer || !camera) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(modelGroup.children, true);
    if (hits.length > 0) {
      const obj = hits[0].object;
      const data: any = obj.userData || {};
      if (data.featureType === 'building') {
        hoverText = `${data.subtype || ''} ${(data.height_final || 0).toFixed(1)}m${
          data.id ? ` (OSM ${data.id})` : ''
        }`;
        return;
      }
    }
    const routeHits = raycaster.intersectObjects(pathGroup.children, true);
    if (routeHits.length > 0) {
      const m = routeHits[0];
      const grades: number[] = m.object.userData?.grades || [];
      const uv = m.uv;
      if (grades.length && uv) {
        const idx = Math.min(grades.length - 1, Math.floor(uv.y * grades.length));
        hoverText = `Steigung: ${(grades[idx] * 100).toFixed(1)}%`;
        return;
      }
    }
    hoverText = null;
  }

  function buildPathGeometry(
    p: GeoJSON.LineString | null,
    baseHeight: number,
    scale: number
  ) {
    clearGroup(pathGroup, true);
    if (!p || p.coordinates.length < 2) return;
    const pts: THREE.Vector3[] = [];
    const grades: number[] = [];
    for (let i = 0; i < p.coordinates.length; i++) {
      const [lon, lat] = p.coordinates[i];
      const elev = elevations?.[i] ?? 0;
      pts.push(new THREE.Vector3(lon * scale, baseHeight + elev + 0.1, lat * scale));
      if (i < p.coordinates.length - 1) {
        const elev2 = elevations?.[i + 1] ?? elev;
        const dist = haversine(p.coordinates[i], p.coordinates[i + 1]);
        const grade = dist === 0 ? 0 : (elev2 - elev) / dist;
        grades.push(grade);
      }
    }
    const segments = pts.length - 1;
    const radial = 8;
    const curve = new THREE.CatmullRomCurve3(pts);
    const geom = new THREE.TubeGeometry(curve, segments, 0.5, radial, false);
    const colors = new Float32Array((segments + 1) * (radial + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const g = i === segments ? grades[segments - 1] : grades[i];
      const col = new THREE.Color(interpolateSlopeColor(g));
      for (let j = 0; j <= radial; j++) {
        const idx = (i * (radial + 1) + j) * 3;
        colors[idx] = col.r;
        colors[idx + 1] = col.g;
        colors[idx + 2] = col.b;
      }
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData = { grades };
    pathGroup.add(mesh);
    if (!modelGroup.children.includes(pathGroup)) {
      modelGroup.add(pathGroup);
    }
  }

  function exportModel(binary = false) {
    buildPathGeometry(path, currentBaseHeight, currentScale);
    if (modelGroup.children.length === 0) {
        toastMessage = 'Kein exportierbares Modell gefunden';
        setTimeout(() => (toastMessage = null), 2000);
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
        toastMessage = 'Datei wurde heruntergeladen';
        setTimeout(() => (toastMessage = null), 2000);
      },
      (err) => console.error('export failed', err),
      { binary }
    );
  }

  function createMergedGeometry() {
    const geometries: THREE.BufferGeometry[] = [];
    modelGroup.updateMatrixWorld(true);
    modelGroup.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        const geom = obj.geometry.clone() as THREE.BufferGeometry;
        geom.applyMatrix4(obj.matrixWorld);
        geometries.push(geom);
      }
    });
    if (geometries.length === 0) return null;
    const merged = mergeBufferGeometries(geometries, false);
    geometries.forEach((g) => g.dispose());
    return merged;
  }

  function exportToSTL() {
    buildPathGeometry(path, currentBaseHeight, currentScale);
    if (modelGroup.children.length === 0) {
      toastMessage = 'Kein exportierbares Modell gefunden';
      setTimeout(() => (toastMessage = null), 2000);
      return;
    }
    const geometry = createMergedGeometry();
    if (!geometry) {
      toastMessage = 'Kein exportierbares Modell gefunden';
      setTimeout(() => (toastMessage = null), 2000);
      return;
    }
    const mesh = new THREE.Mesh(geometry);
    const buffer = exportSTL.fromMesh(mesh, true) as ArrayBuffer;
    geometry.dispose();
    const blob = new Blob([buffer], { type: exportSTL.mimeType });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `modell_export_${timestamp}.stl`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toastMessage = 'Datei wurde heruntergeladen';
    setTimeout(() => (toastMessage = null), 2000);
  }

  async function exportTo3MF() {
    buildPathGeometry(path, currentBaseHeight, currentScale);
    if (modelGroup.children.length === 0) {
      toastMessage = 'Kein exportierbares Modell gefunden';
      setTimeout(() => (toastMessage = null), 2000);
      return;
    }
    modelGroup.updateMatrixWorld(true);
    const blob = await export3MF(modelGroup);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `modell_export_${timestamp}.3mf`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toastMessage = 'Datei wurde heruntergeladen';
    setTimeout(() => (toastMessage = null), 2000);
  }

  function clearGroup(group: THREE.Group, disposeMaterials = false) {
    group.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (disposeMaterials) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m: THREE.Material) => m.dispose());
          } else {
            (obj.material as THREE.Material).dispose();
          }
        }
      }
    });
    group.clear();
  }

  function updateScene(meshes: MeshFeature[], baseHeight: number, scale: number) {
    clearGroup(pathGroup, true);
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
    for (const { mesh, type, subtype } of meshes) {
      if (type === 'building') {
        mesh.material = getBuildingMaterial(subtype || 'building_residential');
      } else {
        mesh.material = basicMaterials[type] || basicMaterials.road;
      }
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
    const unsubRoute = routeStore.subscribe((s) => {
      elevations = s.elevations;
      buildPathGeometry(path, currentBaseHeight, currentScale);
    });

    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    animate();

    return () => {
      unsubCfg();
      unsubModel();
      unsubLoading();
      unsubError();
      unsubPath();
      unsubRoute();
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      clearGroup(modelGroup);
      clearGroup(pathGroup, true);
      disposeBuildingMaterials();
    };
  });

  // exposed for testing
  export function __test_getModelGroup() {
    return modelGroup;
  }
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
        on:click={exportToSTL}
      >
        Download STL
      </button>
      <button
        class="px-2 py-1 bg-orange-600 text-white text-sm rounded"
        on:click={exportTo3MF}
      >
        Download 3MF
      </button>
    </div>
    {#if loadError}
      <span class="px-2 py-1 text-sm bg-red-600 text-white rounded">{loadError}</span>
    {/if}
  </div>
  {#if toastMessage}
    <div class="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded shadow">
      {toastMessage}
    </div>
  {/if}
  {#if hoverText}
    <div class="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
      {hoverText}
    </div>
  {/if}
</div>

