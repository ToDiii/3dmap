# Changelog

Alle wesentlichen Änderungen an diesem Projekt werden in diesem Dokument dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/)  
und dieses Projekt verwendet [SemVer](https://semver.org/lang/de/) für die Versionsverwaltung.

---

## [Unreleased]

### Added
- ShapeSelector zum Zeichnen von Rechtecken und Kreisen auf der Karte
- API-Unterstützung für Shapes beim Modellabruf
- Overpass-Abfragen für gezeichnete Polygone
- Clientseitige Konvertierung von OSM-Daten in 3D-Geometrien
- Viewer rendert Modelle aus dem `modelStore` mit farbigen Materialien
- Export von Modellen als GLTF, GLB und STL mit Dateinamenvorschlag und Nutzerfeedback
- Gebäudeextrusionen direkt auf der Karte
- Export der Kartenextrusion als STL oder 3MF
- STL- und 3MF-Download der sichtbaren Szene mit Zeitstempel und Toast-Bestätigung
- Erweiterte ModelControls für Basishöhe, Gebäudehöhen-Multiplikator bis 5x und Layer-Filter mit Flächenlimit
- Lokale Projekt-Zwischenspeicherung als `.3dmap.json` (Export & Import)
- Projekt-Reset-Funktion zum Leeren aller Projekt-Stores
- MapLibre-`fill-extrusion` für Gebäude mit serverseitig berechneten Höhen
- Unit- und UI-Tests für Overpass-API und Komponenten
- Playwright-E2E-Tests für GPX-Upload, Pfadeditor und Viewer
- Vitest-Setupdatei zur korrekten Renderung von SvelteKit-Komponenten
- Dokumentation: CODEMAP mit Architektur und Datenflüssen
- SSR-sicherer Wrapper für `mergeBufferGeometries` inkl. Basis-Tests
- Routing aus Adressen inkl. Geokodierung, Wegpunktlimit und GPX-Export
- Resiliente Overpass-Abfragen mit konfigurierbaren Endpoints, Timeout, Retries und In-Flight-Dedupe
- Tile-Splitting für große Gebiete inklusive Deduplizierung und Debug-Metadaten

### Fixed
- ESM/SSR-Importprobleme bei `three` durch Inline-Konfiguration in Vite/Vitest

---

## [v1.0.0] – 2025-08-04

### 🚀 Added
- Interaktive 2D-Karte mit MapLibre GL JS
- GPX-Upload mit automatischem Zoom & Pfadanzeige
- Zeichenwerkzeug für manuelle Pfaderstellung (maplibre-gl-draw)
- Layer-Steuerung mit Sichtbarkeits-Toggles (Gebäude, Straßen, Wasser, Grünflächen)
- Parametergesteuertes Modell-UI (Maßstab, Basishöhe, Gebäudehöhen-Multiplikator)
- 3D-Modellgenerierung aus Overpass-Daten (Gebäude, Straßen, Wasser etc.)
- Extrusion von Pfaden als 3D-Routenobjekte
- Dynamische Bounding-Box-Auswahl zur Bereichsbeschränkung
- Exportfunktion für `.gltf` und `.glb` inkl. Pfad
- Vollständig integrierter Docker-Support mit persistenter Cache-Datei
- Unit-Tests für Query- und Konvertierungslogik
- Playwright-Tests für Upload und Fehlerzustände
- Fehleranzeigen im UI bei leeren oder fehlerhaften Daten

### 🛠️ Changed
- Stabilisierung der Serverlogik mit persistenter Caching-Schicht (`model-cache.json`)
- API akzeptiert jetzt Bounding-Box, Pfad oder Parameterkombinationen

### 🐛 Fixed
- Konsistente Modellhöhen bei Kombination von Basishöhe und Multiplikator
- Fallbacks für ungültige oder leere GPX-Dateien

---
