# 3DMap

### 🧭 Projektübersicht
- Beschreibung:  
  Dieses Projekt ist eine interaktive Webanwendung zur Erstellung, Visualisierung und zum Export von 3D-Szenen basierend auf OpenStreetMap-Daten.

- Hauptfunktionen:
  - 2D-Karte mit MapLibre GL JS
  - GPX-Import und Pfad-Zeichnung mit maplibre-gl-draw
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
npx playwright install
```

### 🐳 Docker (optional)
> Hinweis: Eine vollständige Docker-Integration ist möglich (Dockerfile & docker-compose folgen).  
> Damit kann das Projekt z. B. auf Proxmox, NAS oder VPS gehostet werden.

### 🧪 Tests

#### Unit-Tests (z. B. Overpass-Abfrage, 3D-Konvertierung)
```bash
npx vitest run
```

#### UI-Tests (z. B. GPX-Upload, API-Fehler)
```bash
npx playwright test
```

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

### 📚 Verwendete Technologien
- [SvelteKit](https://kit.svelte.dev/)
- [MapLibre GL JS](https://maplibre.org/)
- [Three.js](https://threejs.org/)
- [Overpass API](https://overpass-api.de/)
- [Turf.js](https://turfjs.org/)
- [gpx-parser-builder](https://www.npmjs.com/package/gpx-parser-builder)
- [maplibre-gl-draw](https://github.com/maplibre/maplibre-gl-draw)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

