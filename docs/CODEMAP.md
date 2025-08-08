# CODEMAP

## Modules & Key Components

- **Map.svelte** – MapLibre integration with custom 3D building layer rendered via Three.js. Listens to shape/model config stores and triggers server model API.
- **Viewer.svelte** – Three.js scene for 3D model preview, path overlay and export (GLTF/GLB/STL/3MF).
- **PathEditor.svelte** – Interactive route drawing using maplibre-gl-draw; synchronizes with `pathStore`.
- **GpxUpload.svelte** – Parses GPX files with `@tmcw/togeojson` and adds track to the map and `pathStore`.
- **ModelControls.svelte & stores** – Collect user parameters (scale, base height, multipliers) and drive model retrieval.
- **server/overpass.ts** – Builds Overpass API queries and converts responses to simplified 3D-friendly format.
- **utils/convertTo3D.ts** – Extrudes OSM features into Three.js meshes for the viewer.
- **MapExport.svelte & Viewer exports** – Export visible geometry to STL/3MF/GLTF/GLB.
- **projectIO.ts** – Import/export/reset project state using Svelte stores.

## Data Flow

1. **Input**: User draws path or uploads GPX → `pathStore`.
2. **Area Selection**: Bounding box or polygon via `shapeStore`/`bboxStore`.
3. **Request**: `/api/model` uses Overpass API to fetch OSM data based on selection and model config.
4. **Processing**: `convertTo3D` turns Overpass data into meshes → `modelStore`.
5. **Rendering**:
   - MapLibre `Map.svelte` renders 2D map and extruded buildings.
   - `Viewer.svelte` displays full 3D scene with optional path extrusion.
6. **Export**: `MapExport.svelte` or viewer exporters output STL/3MF/GLTF/GLB.

## Top Risks & Tech Debts

1. **Loose tooling** – No strict TypeScript, linting or formatting; risk of runtime errors and style drift.
2. **Minimal error handling** – API and UI rely on `console.error` without user friendly messages or retries.
3. **Env/config scattering** – API URLs and style options hardcoded; no central config or validation.
4. **Performance hotspots** – Extrusion rendering and repeated fetches lack caching/throttling; potential lag with large areas.
5. **Export correctness** – Exports include all scene objects without visibility checks or cleanup, risking invalid files.

## Modernization Roadmap (5 steps)

1. **Tooling refresh** – Enable strict TypeScript, ESLint+Prettier, Vitest & Playwright, GitHub Actions CI.
2. **Config & logging** – Centralize env handling with schema validation and introduce structured logging helpers.
3. **Routing feature** – Implement address→route→path flow with pluggable geocoding/routing services and GPX export.
4. **Robust Overpass & extrusion** – Add timeout/retry/backoff and expose parameters UI; bring extrusion to map view with base height/multiplier controls.
5. **Export hardening** – Filter by visibility, clean scene before STL/3MF/GLTF/GLB export and timestamped filenames with smoke tests.

