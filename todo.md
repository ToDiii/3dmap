Projektplan: Interaktiver Generator für Geodaten-basierte 3D-Szenen
Vision: Entwicklung einer spezialisierten Web-Anwendung zur Erstellung, Visualisierung und zum Export von detaillierten 3D-Szenen auf Basis von Open-Source-Geodaten. Die Plattform soll den Import von GPS-Tracks (GPX), eine interaktive Pfaderstellung sowie eine feingranulare Steuerung über die visuellen Elemente der Karte und die Parameter des generierten 3D-Modells ermöglichen.

Technologiestack:

Full-Stack-Framework: SvelteKit

Kartendarstellung: MapLibre GL JS

GPS-Daten-Parsing: @tmcw/togeojson

Interaktive Zeichenwerkzeuge: maplibre-gl-draw

Geodaten-Verarbeitung: Turf.js

Datenquelle: Overpass API (OpenStreetMap)

3D-Rendering & Export: Three.js

TODO.md
✔️ Buildfehler durch ungültigen API-Export behoben.
 
Phase 1: Fundament, Karten-Interface & Layer-Management

[x] Projekt-Setup & Basiskonfiguration.

[x] Erstellung der README.md.

[x] Erstellung der CHANGELOG.md.

[x] Docker-Setup & Containerisierung.

Initialisiere das SvelteKit-Projekt mit TypeScript und Tailwind CSS wie im ursprünglichen Plan.

[x] Installiere zusätzliche Bibliotheken: npm install @tmcw/togeojson maplibre-gl-draw.

✔️ Unterstützung für ES-Module (type="module") aktiviert, um ESM-Bibliotheken zu importieren.

✔️ maplibre-gl-draw läuft nun clientseitig und ist SSR-kompatibel.

[ ] Entwicklung der zentralen Karten-Komponente (Map.svelte).

Initialisiere MapLibre GL JS mit einem flexiblen Vektor-Kartenstil (z.B. von Stadia Maps), der klar definierte Layer für Gebäude, Gewässer, Grünflächen (landuse=grass, natural=wood), Sandflächen (natural=sand) und Straßen enthält.

Implementiere ein responsives UI-Layout mit einem persistenten Seitenpanel für alle Steuerungsoptionen.

[ ] Implementierung der Layer- und Detailsteuerung.

Erstelle eine LayerControl.svelte Komponente.

Füge Checkboxes/Toggles für primäre Kartenelemente hinzu: Gebäude, Gewässer, Grünflächen, Straßennetz.

Die Steuerelemente schalten die Sichtbarkeit der entsprechenden Layer in MapLibre über map.setLayoutProperty('layer-id', 'visibility', 'visible'/'none') um.

Füge eine Option "Details reduzieren" hinzu. Diese Funktion nutzt MapLibre-Filter (setFilter), um kleine Objekte auszublenden (z.B. Gebäude mit einer Fläche unter 50m²), was die Übersichtlichkeit erhöht.

Phase 2: GPX-Import und interaktive Pfad-Werkzeuge

[x] Implementierung des GPX-Track-Uploads.

Erstelle eine GpxUpload.svelte Komponente mit einem <input type="file" accept=".gpx">.

Nutze die @tmcw/togeojson-Bibliothek, um die hochgeladene GPX-Datei clientseitig zu parsen.

Extrahiere die Koordinaten des ersten Tracks aus den geparsten Daten.

Zeichne den Verlauf als Polyline (Linienzug) auf der Karte, indem du eine neue GeoJSON-Quelle und einen Linien-Layer zu MapLibre hinzufügst.

Die Kamera soll automatisch auf den Bereich des hochgeladenen Tracks zoomen (map.fitBounds).

[ ] Entwicklung eines Werkzeugs zur interaktiven Pfaderstellung.

Konfiguriere maplibre-gl-draw, um den Modus zum Zeichnen und Bearbeiten von Linienzügen (draw_line_string) zu aktivieren.

Stelle sicher, dass der Benutzer:

Wegpunkte durch Klicken auf die Karte hinzufügen kann.

Bestehende Wegpunkte per Drag-and-Drop verschieben kann.

Wegpunkte nachträglich einfügen kann (durch Klicken auf die Linie zwischen zwei Punkten).

Einzelne Wegpunkte entfernen kann (z.B. durch Anklicken und Drücken der Entf-Taste).

Die Koordinaten des gezeichneten Pfades werden reaktiv in einem Svelte Store gespeichert.

Phase 3: Erweiterte 3D-Generierung & API

[x] Erweiterung des UI für 3D-Modellierungsoptionen (ModelControls.svelte).

Implementiere UI-Elemente für die folgenden Parameter:

Maßstab: Ein Dropdown-Menü oder Slider (z.B. 1:500, 1:1000, 1:2500, 1:5000). Dieser Wert steuert primär die maximale Größe des Auswahlbereichs und potenziell den Detailgrad der Abfrage.

Basishöhe (m): Ein numerisches Eingabefeld, um das gesamte Modell anzuheben oder abzusenken.

Gebäudehöhe-Multiplikator: Ein Slider (z.B. von 0.5 bis 3.0), um die prozedural ermittelte Höhe aller Gebäude zu skalieren.

Elementauswahl für 3D-Modell: Eine Gruppe von Checkboxes (Gebäude, Straßen, Gewässer etc.), die festlegt, welche Datentypen von der Overpass API abgefragt und im 3D-Modell RENDERED werden sollen (unabhängig von der 2D-Kartenansicht).

[x] Anpassung des API-Endpunkts (/api/model/+server.ts).

Erweitere die POST-Anfrage, sodass sie alle neuen Parameter (Basishöhe, Multiplikator, Elementauswahl) entgegennimmt.

Passe die Overpass-Query dynamisch an, je nachdem, welche Elemente der Benutzer für das 3D-Modell ausgewählt hat.

Integriere die Basishöhe und den Gebäudehöhe-Multiplikator in die serverseitige Logik zur 3D-Geometrie-Synthese. Die Basishöhe wird auf die Y-Koordinate aller Vertices addiert, der Multiplikator wird bei der Höhenberechnung der Gebäude angewendet.

Phase 4: 3D-Synthese, Visualisierung & Export

[ ] Verfeinerung der serverseitigen 3D-Generierung.

Implementiere die Logik zur Verarbeitung der ausgewählten Elemente. Beispielsweise können Straßen und Gewässer als flache, extrudierte Flächen zum 3D-Modell hinzugefügt werden, um Kontext zu schaffen.

Wende die Basishöhe und den Gebäudehöhe-Multiplikator wie in Phase 3 definiert an.

Stelle weiterhin sicher, dass alle Geometrien für eine maximale Performance zu einem einzigen Mesh zusammengefügt werden, bevor die Daten an den Client gesendet werden.

[x] Optimierung der 3D-Visualisierung (Viewer.svelte).

Die Viewer-Komponente bleibt im Kern gleich, lädt aber das nun komplexere Modell.

Passe die initiale Kameraposition an, um sicherzustellen, dass das gesamte Modell inklusive der neuen Elemente gut sichtbar ist.

[x] Anpassung der Export-Funktion.

Die bestehende GLTFExporter-Logik kann beibehalten werden. Sie exportiert die gesamte Szene, die nun die vom Benutzer ausgewählten und konfigurierten 3D-Elemente enthält. Stelle sicher, dass der Dateiname des Exports den Projektnamen oder das Datum widerspiegelt.

## Aktuelle TODOs

[x] Fix: Viewer lädt keine Features obwohl Bounding Box aktiv
[x] Fix: PathEditor kann gezeichnete Pfade nicht löschen
[x] Feature: Kreise als Auswahlfläche
[x] Feature: Logging und Feedback, wenn keine OSM-Daten geladen werden
[x] Feature: Shape-Selector für Rechtecke und Kreise
[x] Feature: Overpass-Abfrage für gezeichnete Polygone
[x] Feature: STL-Export
[x] Feature: Gebäudeextrusion auf der Karte
[x] Feature: Export der Kartenextrusion als STL/3MF
[x] Feature: Projekt-Zwischenspeicherung als JSON-Datei
[x] Feature: Projekt-Zurücksetzen (Stores leeren)
[x] Testabdeckung für API und Komponenten
[x] Playwright E2E-Tests für GPX-Upload, Pfadeditor und Viewer
[x] Feature: STL-/3MF-Export-Buttons mit Toast-Bestätigung
[x] Codebasiskarte erstellt
[x] Fix: SSR-sicherer Wrapper für mergeBufferGeometries
[x] Feature: Routing aus Adressen
[x] Feature: MapLibre 3D-Extrusion mit serverseitiger Höhenberechnung
[x] Overpass-Robustheit & Tile-Splitting
[x] Feature: Höhenprofil & Routenkorridor
[x] Feature: Thematische Schemata, Legende und Hover-Infos
[x] CI/CD: Docker-Build & Release-Workflow über GHCR
[x] Server-Proxies für Geocoding & Routing
[x] Build: PNG-Icons werden zur Build-Zeit aus SVG generiert
[x] Feature: Szenenstate als komprimierten Permalink teilen
[x] Feature: Tastatur-Shortcuts & Command Palette
[x] Feature: Optionale Telemetrie (Sentry) und Web-Vitals
[x] Permalink SSR-Fix
[x] Error-Flow stabilisieren / ErrorBoundary entfernen
