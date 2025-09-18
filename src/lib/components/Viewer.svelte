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
        import { pathStyleStore } from '$lib/stores/pathStyleStore';
	import { modelStore, modelLoading, modelError } from '$lib/stores/modelStore';
	import { routeStore } from '$lib/stores/routeStore';
	import { uiConfigStore } from '$lib/stores/uiConfigStore';
	import { colorPalette } from '$lib/stores/colorPalette';
	import { get } from 'svelte/store';
	import type { MeshFeature } from '$lib/utils/convertTo3D';
	import {
		getBuildingMaterial,
		basicMaterials,
		disposeBuildingMaterials,
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
	let baseMesh: THREE.Mesh | undefined;
	let frameMesh: THREE.Mesh | undefined;
	let uiCfg = get(uiConfigStore);
	let palette = get(colorPalette);
	uiConfigStore.subscribe((v) => (uiCfg = v));
	colorPalette.subscribe((v) => (palette = v));
	let toastMessage: string | null = null;
	let loadError: string | null = null;
        let currentScale = 1;
        let currentBaseHeight = 0;
        let path: GeoJSON.LineString | null = null;
        let elevations: number[] | undefined;
        let isLoading = false;
        let pathStyle = get(pathStyleStore);
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

        function buildPathGeometry(p: GeoJSON.LineString | null, baseHeight: number, scale: number) {
                clearGroup(pathGroup, true);
                if (!p || p.coordinates.length < 2) return;
                const coords = p.coordinates as [number, number][];
                const pts: THREE.Vector3[] = [];
                const grades: number[] = [];
                const { widthMeters, heightMM, color } = pathStyle;
                const baseOffset = Math.max((heightMM ?? 0) / 1000, 0.001);
                let unitsPerMeter: number | null = null;
                for (let i = 0; i < coords.length; i++) {
                        const [lon, lat] = coords[i];
                        const elev = elevations?.[i] ?? 0;
                        const point = new THREE.Vector3(
                                lon * scale,
                                baseHeight + elev + baseOffset,
                                lat * scale,
                        );
                        pts.push(point);
                        if (i < coords.length - 1) {
                                const elev2 = elevations?.[i + 1] ?? elev;
                                const dist = haversine(coords[i], coords[i + 1]);
                                const grade = dist === 0 ? 0 : (elev2 - elev) / dist;
                                grades.push(grade);
                                if (unitsPerMeter === null && dist > 0) {
                                        const next = coords[i + 1];
                                        const dx = (next[0] - lon) * scale;
                                        const dz = (next[1] - lat) * scale;
                                        const planar = Math.sqrt(dx * dx + dz * dz);
                                        if (planar > 0) {
                                                unitsPerMeter = planar / dist;
                                        }
                                }
                        }
                }
                const segments = pts.length - 1;
                const radial = 8;
                const curve = new THREE.CatmullRomCurve3(pts);
                const fallbackUnitsPerMeter = scale > 0 ? 1 / scale : 0;
                const resolvedUnitsPerMeter =
                        widthMeters > 0
                                ? unitsPerMeter || fallbackUnitsPerMeter || 0
                                : unitsPerMeter || fallbackUnitsPerMeter;
                const rawRadius =
                        widthMeters > 0 && resolvedUnitsPerMeter > 0
                                ? (widthMeters * resolvedUnitsPerMeter) / 2
                                : 0.5;
                const radius = Math.max(rawRadius, 0.01);
                const geom = new THREE.TubeGeometry(curve, segments, radius, radial, false);
                const useGradient = widthMeters <= 0 || !color || color === 'gradient';
                let material: THREE.MeshStandardMaterial;
                if (useGradient) {
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
                        material = new THREE.MeshStandardMaterial({ vertexColors: true });
                } else {
                        let meshColor: THREE.Color;
                        try {
                                meshColor = new THREE.Color(color);
                        } catch (err) {
                                meshColor = new THREE.Color('#ff524f');
                        }
                        material = new THREE.MeshStandardMaterial({ color: meshColor });
                }
                const mesh = new THREE.Mesh(geom, material);
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
						type: 'model/gltf-binary',
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
		if (baseMesh) {
			scene.remove(baseMesh);
			baseMesh.geometry.dispose();
			(baseMesh.material as THREE.Material).dispose();
			baseMesh = undefined;
		}
		if (frameMesh) {
			scene.remove(frameMesh);
			frameMesh.geometry.dispose();
			(frameMesh.material as THREE.Material).dispose();
			frameMesh = undefined;
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
		const sizeVec = box.getSize(new THREE.Vector3());
		const size = sizeVec.length();
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
		const width = sizeVec.x;
		const depth = sizeVec.z;
		if (uiCfg.baseLayerMM > 0) {
			const extra = 0.01;
			const geom = new THREE.BoxGeometry(
				width * (1 + extra),
				uiCfg.baseLayerMM / 1000,
				depth * (1 + extra)
			);
			const mat = new THREE.MeshStandardMaterial({ color: palette.base });
			baseMesh = new THREE.Mesh(geom, mat);
			baseMesh.position.set(
				box.min.x + width / 2,
				baseHeight - uiCfg.baseLayerMM / 1000,
				box.min.z + depth / 2
			);
			scene.add(baseMesh);
		} else {
			const gridSize = size || 100;
			const grid = new THREE.GridHelper(gridSize, 20);
			grid.position.y = baseHeight;
			ground = grid;
			scene.add(grid);
		}
		if (uiCfg.frame.enabled) {
			const outerW = width + (uiCfg.frame.thicknessMM / 1000) * 2;
			const outerD = depth + (uiCfg.frame.thicknessMM / 1000) * 2;
			const shape = new THREE.Shape([
				new THREE.Vector2(-outerW / 2, -outerD / 2),
				new THREE.Vector2(outerW / 2, -outerD / 2),
				new THREE.Vector2(outerW / 2, outerD / 2),
				new THREE.Vector2(-outerW / 2, outerD / 2),
			]);
			const hole = new THREE.Path([
				new THREE.Vector2(-width / 2, -depth / 2),
				new THREE.Vector2(width / 2, -depth / 2),
				new THREE.Vector2(width / 2, depth / 2),
				new THREE.Vector2(-width / 2, depth / 2),
			]);
			shape.holes.push(hole);
			const geom = new THREE.ExtrudeGeometry(shape, {
				depth: uiCfg.frame.heightMM / 1000,
				bevelEnabled: false,
			});
			geom.rotateX(-Math.PI / 2);
			geom.translate(box.min.x + width / 2, baseHeight, box.min.z + depth / 2);
			const mat = new THREE.MeshStandardMaterial({ color: palette.frame });
			frameMesh = new THREE.Mesh(geom, mat);
			scene.add(frameMesh);
		}
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
                const unsubPathStyle = pathStyleStore.subscribe((style) => {
                        pathStyle = style;
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
                        unsubPathStyle();
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

<div class="relative h-full w-full">
	<div bind:this={container} class="h-full w-full"></div>
	{#if isLoading}
		<div class="absolute inset-0 flex items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
			></div>
		</div>
	{/if}
	<div class="absolute left-2 top-2 flex flex-col gap-2">
		<div class="flex gap-2">
			<button
				class="rounded bg-blue-600 px-2 py-1 text-sm text-white"
				on:click={() => exportModel(false)}
			>
				GLTF exportieren
			</button>
			<button
				class="rounded bg-green-600 px-2 py-1 text-sm text-white"
				on:click={() => exportModel(true)}
			>
				GLB exportieren
			</button>
			<button class="rounded bg-purple-600 px-2 py-1 text-sm text-white" on:click={exportToSTL}>
				Download STL
			</button>
			<button class="rounded bg-orange-600 px-2 py-1 text-sm text-white" on:click={exportTo3MF}>
				Download 3MF
			</button>
		</div>
		{#if loadError}
			<span class="rounded bg-red-600 px-2 py-1 text-sm text-white">{loadError}</span>
		{/if}
	</div>
	{#if toastMessage}
		<div class="fixed bottom-4 right-4 rounded bg-gray-800 px-3 py-2 text-white shadow">
			{toastMessage}
		</div>
	{/if}
	{#if hoverText}
		<div class="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
			{hoverText}
		</div>
	{/if}
</div>
