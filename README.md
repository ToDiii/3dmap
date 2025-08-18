# 3DMap

### 🧭 Projektübersicht
- Beschreibung:  
  Dieses Projekt ist eine interaktive Webanwendung zur Erstellung, Visualisierung und zum Export von 3D-Szenen basierend auf OpenStreetMap-Daten.

- Hauptfunktionen:
  - 2D-Karte mit MapLibre GL JS
  - GPX-Import und Pfad-Zeichnung mit maplibre-gl-draw
  - Routing aus Adressen mit Geokodierung und GPX-Export
  - Dynamische OSM-Abfragen über die Overpass API
  - Extrusion von Geometrien zu 3D-Modellen mit Three.js
  - Parametergesteuertes Modell-UI (Maßstab, Höhe, Layerauswahl)
  - Bounding-Box-Auswahl auf der Karte
  - Export als `.gltf` und `.glb`
  - Fehlerhandling im UI
  - Tests für API und UI

### 🚀 Schnellstart (lokale Entwicklung)

#### Voraussetzungen
- Node.js ≥ 18
- npm oder pnpm

#### Installation
```bash
npm install
npm run dev
```

#### Optional: Playwright vorbereiten
```bash
npx playwright install --with-deps
```

### 🐳 Docker

#### Build & Run
```bash
docker compose up --build
```

### 🧪 Tests

#### Unit-Tests (z. B. Overpass-Abfrage, 3D-Konvertierung)
```bash
npm test
```

#### E2E-Tests (optional)
Standardmäßig sind E2E-Tests deaktiviert.
Aktivieren:
1) Browser installieren: `npx playwright install --with-deps`
2) Flag setzen und ausführen:
   - macOS/Linux: `E2E_ENABLED=true npm run test:e2e`
   - Windows (Powershell): `$env:E2E_ENABLED='true'; npm run test:e2e`

### 🗺️ Routing aus Adressen
Die Anwendung unterstützt das Berechnen von Routen aus mehreren Adressen. Die Geokodierung erfolgt über den in `GEOCODE_PROVIDER` festgelegten Dienst (nominatim, opencage oder mapbox). Der Routingdienst wird über `ROUTING_PROVIDER` gewählt (openrouteservice, osrm oder graphhopper). API‑Schlüssel können über `GEOCODE_API_KEY` und `ROUTING_API_KEY` gesetzt werden. Pro Route sind maximal `ROUTING_MAX_WAYPOINTS` Wegpunkte erlaubt. Beachten Sie die Nutzungsbedingungen und Rate-Limits der jeweiligen Anbieter.

### ⚙️ Architektur

| Ordner / Datei                      | Beschreibung                                 |
|------------------------------------|----------------------------------------------|
| `src/lib/components/`              | Svelte-Komponenten (Map, Viewer, Upload...)  |
| `src/lib/stores/`                  | Reactive Stores (z. B. Map, Pfad, Konfiguration) |
| `src/routes/api/model/+server.ts` | Modell-API für Overpass & 3D-Erzeugung       |
| `model-cache.json`                 | Persistenter Server-Cache für Overpass-Daten |

### 📦 Exportformate
- Unterstützte Formate: `.gltf`, `.glb`
- Empfohlener Online-Viewer: [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/)
- Export über Button im 3D-Viewer
- Dateiname enthält Zeitstempel für Nachvollziehbarkeit

### 🏗️ Map-seitige 3D-Extrusion
Serverseitig berechnete OSM-Gebäude werden zusätzlich als GeoJSON zurückgegeben und in MapLibre via `fill-extrusion` dargestellt. Die Eigenschaften `base_height` und `height_final` enthalten Basishöhe sowie den mit dem UI-Multiplikator verrechneten Endwert. Layer für Gebäude, Wasser und Grünflächen lassen sich in der LayerControl ein- oder ausblenden.

### 📚 Verwendete Technologien
- [SvelteKit](https://kit.svelte.dev/)
- [MapLibre GL JS](https://maplibre.org/)
- [Three.js](https://threejs.org/)
- [Overpass API](https://overpass-api.de/)
- [Turf.js](https://turfjs.org/)
- [@tmcw/togeojson](https://github.com/tmcw/togeojson)
- [maplibre-gl-draw](https://github.com/maplibre/maplibre-gl-draw)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

