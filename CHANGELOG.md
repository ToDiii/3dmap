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
