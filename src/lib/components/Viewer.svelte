<script lang="ts">
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  import { onMount } from 'svelte';
  import { modelConfigStore } from '$lib/stores/modelConfigStore';
  import type { ModelConfig } from '$lib/stores/modelConfigStore';

  let container: HTMLDivElement;
  let renderer: THREE.WebGLRenderer;
  let camera: THREE.PerspectiveCamera;
  let scene: THREE.Scene;
  let controls: OrbitControls;
  let modelGroup: THREE.Group = new THREE.Group();
  let ground: THREE.Object3D | undefined;

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
          elements
        })
      });
      const data = await res.json();
      buildScene(data.features, cfg.baseHeight);
    } catch (err) {
      console.error('failed to load model', err);
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

  function buildScene(features: Feature[], baseHeight: number) {
    clearGroup(modelGroup);
    if (ground) {
      scene.remove(ground);
      ground = undefined;
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

    for (const type of Object.keys(geoms)) {
      const g = geoms[type];
      if (!g.length) continue;
      const merged = mergeBufferGeometries(g);
      const mesh = new THREE.Mesh(merged, materials[type]);
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

    window.addEventListener('resize', onResize);
    animate();

    return () => {
      unsub();
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
    };
  });
</script>

<div bind:this={container} class="w-full h-full"></div>

