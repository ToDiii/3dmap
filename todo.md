TODO: Nachbau von map2model.com
Dieses Dokument beschreibt die Schritte, um eine Webanwendung zu erstellen. Wir verwenden SvelteKit als Full-Stack-Framework, MapLibre GL JS für die Kartendarstellung, Turf.js für Geodaten-Berechnungen und Three.js für die 3D-Visualisierung und den Export. Alle Daten werden von der OpenStreetMap (OSM) Overpass API bezogen.

Phase 1: Projekt-Setup und Karten-Interface
[ ] Initialisiere ein neues SvelteKit-Projekt.

Wähle "Skeleton project".

Füge TypeScript-Unterstützung hinzu.

Richte ESLint und Prettier für Code-Qualität ein.

[ ] Installiere notwendige Bibliotheken.

npm install maplibre-gl @turf/turf three

npm install -D @types/three @types/turf

[ ] Erstelle eine Vollbild-Kartenkomponente (Map.svelte).

Initialisiere MapLibre GL JS.

Nutze einen freien Kartenstil, z.B. von Maptiler oder Stadia Maps.

Setze den initialen Kartenfokus auf eine Stadt mit guten OSM-Daten (z.B. Berlin, Deutschland).

Die Karte soll den gesamten Viewport ausfüllen.

[ ] Implementiere ein einfaches UI-Overlay.

Erstelle eine Controls.svelte Komponente.

Füge einen Header-Titel hinzu.

Erstelle einen Button mit der Beschriftung "Bereich auswählen", der vorerst deaktiviert ist.

Phase 2: Bereichsauswahl und Datenabruf
[ ] Implementiere eine Funktion zur Bereichsauswahl auf der Karte.

Nutze die maplibre-gl-draw Erweiterung oder baue eine simple Rechteck-Zieh-Funktion.

Wenn der Benutzer einen Bereich gezeichnet hat, speichere die Bounding-Box-Koordinaten ([minLng, minLat, maxLng, maxLat]) in einem Svelte Store.

Aktiviere den "Modell generieren"-Button, sobald eine gültige Auswahl existiert.

[ ] Erstelle einen SvelteKit API Endpoint (/api/generate-model).

Dieser Endpoint akzeptiert eine Bounding-Box via POST-Request.

Er soll die Bounding-Box validieren.

[ ] Rufe Gebäudedaten von der Overpass API ab.

Konstruiere im API-Endpoint eine Overpass QL-Query, um alle Gebäude (way["building"]) innerhalb der übergebenen Bounding-Box zu finden.

Führe die Anfrage an die öffentliche Overpass API (https://overpass-api.de/api/interpreter) aus.

Konvertiere die OSM-Antwort (XML oder JSON) in ein GeoJSON-Format. Die osm-and-geojson Bibliothek kann hier helfen, oder schreibe eine eigene Transformationslogik.

Phase 3: 3D-Modell-Generierung
[ ] Verarbeite die GeoJSON-Daten im Backend.

Für jedes Polygon (Gebäude) im GeoJSON:

Weise eine zufällige Höhe zu (z.B. zwischen 10 und 50 Metern), da OSM nicht immer Höhenangaben liefert. Speichere die Höhe als Property im GeoJSON-Feature.

Vereinfache komplexe Polygone optional mit turf.simplify, um die Performance zu verbessern.

[ ] Implementiere die Extrusionslogik.

Erstelle eine serverseitige Funktion, die GeoJSON-Polygone in eine 3D-Geometrie umwandelt.

Nutze eine Bibliothek wie earcut für die Triangulierung der Grundflächen.

Extrudiere die triangulierte Fläche zur zugewiesenen Höhe, um einfache Gebäudeblöcke zu erstellen.

Gib die resultierenden Vertices und Faces als JSON-Struktur an das Frontend zurück.

Phase 4: 3D-Visualisierung und Export
[ ] Erstelle eine 3D-Viewer-Komponente (Viewer.svelte).

Nutze Three.js, um eine Szene, eine Kamera (PerspectiveCamera) und einen Renderer (WebGLRenderer) zu initialisieren.

Implementiere eine OrbitControls-Steuerung für die Navigation in der 3D-Szene.

Füge eine einfache Beleuchtung hinzu (AmbientLight und DirectionalLight).

[ ] Visualisiere das generierte Modell.

Wenn der API-Call aus Phase 2 erfolgreich ist, übergib die Geometriedaten an die Viewer.svelte Komponente.

Erstelle für jedes Gebäude ein THREE.Mesh mit BufferGeometry aus den Vertices und einem MeshStandardMaterial.

Füge die Meshes der Szene hinzu.

Füge eine Grundplatte (PlaneGeometry) hinzu, die dem ausgewählten Bereich entspricht.

[ ] Implementiere die Export-Funktion.

Füge einen "Exportieren"-Button zum UI hinzu.

Installiere THREE.GLTFExporter.

Schreibe eine Funktion, die die aktuelle Three.js-Szene (nur die Gebäudemeshes) in das glTF/GLB-Format exportiert.

Triggere einen Browser-Download der generierten .glb-Datei.

Phase 5: Finalisierung und UX-Verbesserungen
[ ] Implementiere Lade- und Fehlerzustände.

Zeige einen Lade-Spinner an, während die Daten von der Overpass API geladen und verarbeitet werden.

Zeige dem Benutzer aussagekräftige Fehlermeldungen an (z.B. "Keine Gebäude in diesem Bereich gefunden" oder "API-Fehler").

[ ] Optimiere die 3D-Performance.

Fasse alle Gebäude-Geometrien serverseitig in einer einzigen BufferGeometry zusammen (BufferGeometryUtils.mergeGeometries), um die Anzahl der Draw Calls im Frontend drastisch zu reduzieren.

[ ] Stil verfeinern.

Verbessere das CSS, um ein sauberes und modernes Erscheinungsbild zu erzielen, das sich an der Vorlage orientiert.

Sorge für eine gute mobile Darstellung (Responsive Design).

[ ] Deployment.

Konfiguriere den SvelteKit-Adapter für eine geeignete Plattform (z.B. adapter-auto für Vercel oder adapter-node für einen eigenen Server).

Deploye die Anwendung.
