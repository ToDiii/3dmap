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

#### Run via Docker

- Pull:

```bash
docker pull ghcr.io/todiii/3dmap:latest
```

- Start:

```bash
docker run -p 3000:3000 \
  -e OVERPASS_ENDPOINTS="https://overpass-api.de/api/interpreter" \
  -e ROUTING_PROVIDER=openrouteservice -e ROUTING_API_KEY=sk_xxx \
  -e GEOCODE_PROVIDER=nominatim \
  -e ELEVATION_PROVIDER=opentopodata \
  ghcr.io/todiii/3dmap:latest
  ```

- Optional: Volume für Cache

```bash
-v $(pwd)/model-cache.json:/app/model-cache.json
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

### 🏔️ Höhenprofil & Routenkorridor
Die Anwendung kann Höhenprofile entlang berechneter Routen erstellen und die 3D-Route an das Gelände anpassen. Die folgenden Umgebungsvariablen steuern das Verhalten:

| Variable | Beschreibung | Default |
|---|---|---|
| `ELEVATION_PROVIDER` | Höhenanbieter (`opentopodata`, `open-elevation`, `mapbox-terrain`) | `opentopodata` |
| `ELEVATION_API_KEY` | API-Key (falls vom Anbieter verlangt) | - |
| `ELEVATION_BATCH_SIZE` | Punkte pro Anfrage | `100` |
| `ELEVATION_MAX_SAMPLES` | Maximale Stützpunkte entlang der Route | `2000` |
| `ROUTE_BUFFER_METERS` | Standardbreite des Routenkorridors für OSM-Daten | `75` |

Nach der Routenberechnung wird automatisch ein Korridor (Buffer) erzeugt, aus dem OSM-Features für das 3D-Modell geladen werden. Bei Ausfällen des Höhenproviders wird die Route ohne Profil angezeigt.

### 🌐 Overpass-Konfiguration
Die serverseitigen Overpass-Abfragen werden über Umgebungsvariablen gesteuert. Wichtige Variablen:

| Variable | Beschreibung | Default |
|---|---|---|
| `OVERPASS_ENDPOINTS` | Kommagetrennte Liste der Interpreter-Endpunkte | `https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter` |
| `OVERPASS_TIMEOUT_MS` | Request-Timeout in Millisekunden | `30000` |
| `OVERPASS_MAX_RETRIES` | Anzahl der maximalen Retries bei Fehlern | `2` |
| `OVERPASS_RETRY_BASE_MS` | Basiswert für Exponential Backoff | `500` |
| `OVERPASS_MAX_AREA_KM2` | Ab dieser Fläche wird Tile-Splitting aktiviert | `25` |
| `OVERPASS_TILE_DEG` | Kachelgröße in Grad | `0.05` |
| `OVERPASS_CONCURRENCY` | Parallele Overpass-Anfragen | `1` |
| `OVERPASS_USER_AGENT` | User-Agent für die API-Calls | `3dmap/1.0 (+contact@example.com)` |

### 🤝 Fair Use
Die Overpass API unterliegt strengen Rate-Limits. Durch serielle Abfragen, konfigurierbare Timeouts und Retries versucht die Anwendung, diese Limits einzuhalten. Bitte nutzen Sie eigene Endpunkte oder Spiegelserver für umfangreiche Anfragen und vermeiden Sie unnötige Last.

### 🧩 Große Gebiete & Tile-Splitting
Bereiche größer als `OVERPASS_MAX_AREA_KM2` werden automatisch in kleinere Kacheln (`OVERPASS_TILE_DEG`) unterteilt. Die Ergebnisse werden dedupliziert und zusammengeführt. Im Debug-Panel der Anwendung lässt sich nachvollziehen, wie viele Kacheln geladen wurden.

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

### 🎨 Themenschemata & Legende
Gebäude erhalten je nach Subtyp (Wohnen, Gewerbe, Industrie) eigene Farben, Wasser- und Grünflächen besitzen ebenfalls feste Farbcodes. Routen werden anhand ihrer Steigung von grün (flach) bis rot (steil) koloriert. Eine Legende in der Seitenleiste erläutert die Zuordnung und zeigt eine kleine Steigungsskala.

![Legende](docs/legend-screenshot.png)

Die Gebäudetypisierung erfolgt heuristisch über OSM-Tags wie `building=*`, `amenity` oder `shop`. Unvollständige Tags können zu nicht klassifizierbaren Gebäuden führen.

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

