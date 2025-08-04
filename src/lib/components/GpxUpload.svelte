<script lang="ts">
  import { get } from 'svelte/store';
  import maplibregl from 'maplibre-gl';
  import GPX from 'gpx-parser-builder';
  import { mapStore } from '$lib/stores/map';

  let file: File | null = null;

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    file = input.files[0];
    const text = await file.text();
    const gpx = GPX.parse(text);
    if (!gpx || !gpx.trk || gpx.trk.length === 0) return;
    const track = gpx.trk[0];
    const coords: [number, number][] = [];
    track.trkseg?.forEach((seg: any) => {
      seg.trkpt?.forEach((pt: any) => {
        const lat = pt.$?.lat;
        const lon = pt.$?.lon;
        if (typeof lat === 'number' && typeof lon === 'number') {
          coords.push([lon, lat]);
        }
      });
    });
    if (coords.length === 0) return;
    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords
      },
      properties: {}
    } as GeoJSON.Feature<GeoJSON.LineString>;

    const map = get(mapStore);
    if (!map) return;

    const sourceId = 'gpx-track';
    const layerId = 'gpx-track-line';
    const existing = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(geojson);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojson });
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#ff0000',
          'line-width': 4
        }
      });
    }

    const bounds = coords.reduce(
      (b, coord) => b.extend(coord as [number, number]),
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );
    map.fitBounds(bounds, { padding: 20 });
  }
</script>

<div class="space-y-2">
  <input type="file" accept=".gpx" on:change={handleFileChange} />
  {#if file}
    <p class="text-sm">Geladene Datei: {file.name}</p>
  {/if}
</div>

