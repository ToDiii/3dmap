<script lang="ts">
  import { get } from 'svelte/store';
  import { routeStore } from '$lib/stores/routeStore';
  import { geocodeAddress } from '$lib/services/geocode';
  import { routeWaypoints } from '$lib/services/route';
  import { lineStringToGpx } from '$lib/utils/gpx';
  import { ROUTING_MAX_WAYPOINTS, ROUTE_BUFFER_METERS } from '$lib/config/env';
  import { loadModelForRoute } from '$lib/stores/modelStore';
  import ElevationChart from './ElevationChart.svelte';

  let loadingId: string | null = null;
  let routing = false;
  let error: string | null = null;
  let elevLoading = false;
  let elevError: string | null = null;
  let corridorOnly = true;
  const suggestions: Record<string, { lat: number; lon: number; label: string }[]> = {};
  const timers: Record<string, any> = {};

  if (get(routeStore).waypoints.length === 0) {
    routeStore.addWaypoint();
    routeStore.addWaypoint();
  }

  function handleInput(id: string, value: string) {
    routeStore.setAddress(id, value);
    if (timers[id]) clearTimeout(timers[id]);
    if (!value) return;
    timers[id] = setTimeout(async () => {
      loadingId = id;
      try {
        suggestions[id] = await geocodeAddress(value);
      } catch (e) {
        error = 'Geokodierung fehlgeschlagen';
      }
      loadingId = null;
    }, 300);
  }

  function chooseSuggestion(id: string, s: { lat: number; lon: number; label: string }) {
    routeStore.setAddress(id, s.label);
    routeStore.setCoord(id, [s.lon, s.lat]);
    suggestions[id] = [];
  }

  async function calculateRoute() {
    error = null;
    routing = true;
    try {
      const coords = get(routeStore).waypoints.map((w) => w.coord).filter(Boolean) as [
        number,
        number
      ][];
      if (coords.length < 2) throw new Error('need at least two waypoints');
      const res = await routeWaypoints(coords);
      routeStore.setRoute(res.geometry, res.distanceKm, res.durationMin);
      elevLoading = true;
      try {
        await routeStore.enrichRouteWithElevation(res.geometry);
        if (corridorOnly) {
          await loadModelForRoute(res.geometry, ROUTE_BUFFER_METERS, true);
        }
        elevError = null;
      } catch (e) {
        elevError = 'H\u00f6henprofil nicht verf\u00fcgbar';
      }
      elevLoading = false;
    } catch (e) {
      error = 'Routing fehlgeschlagen';
    }
    routing = false;
  }

  function exportGpx() {
    const { route } = get(routeStore);
    if (!route) return;
    const gpx = lineStringToGpx('Route', route);
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route.gpx';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="space-y-4">
  {#each $routeStore.waypoints as wp, i}
    <div class="relative">
      <input
        class="border p-1 w-full"
        type="text"
        placeholder={i === 0 ? 'Start' : i === $routeStore.waypoints.length - 1 ? 'Ziel' : 'Stopp'}
        value={wp.address}
        on:input={(e) => handleInput(wp.id, (e.target as HTMLInputElement).value)}
      />
      {#if loadingId === wp.id}
        <span class="text-sm">Lade...</span>
      {/if}
      {#if suggestions[wp.id]?.length}
        <ul class="absolute z-10 bg-white border w-full max-h-40 overflow-auto">
          {#each suggestions[wp.id] as s}
            <li>
              <button
                type="button"
                class="p-1 w-full text-left hover:bg-gray-200"
                on:click={() => chooseSuggestion(wp.id, s)}
              >
                {s.label}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="flex space-x-1 mt-1">
        <button on:click={() => routeStore.removeWaypoint(wp.id)} class="px-1 bg-red-500 text-white">X</button>
        <button
          on:click={() => routeStore.reorder(i, i - 1)}
          disabled={i === 0}
          class="px-1 bg-gray-300"
        >
          ↑
        </button>
        <button
          on:click={() => routeStore.reorder(i, i + 1)}
          disabled={i === $routeStore.waypoints.length - 1}
          class="px-1 bg-gray-300"
        >
          ↓
        </button>
      </div>
    </div>
  {/each}
  {#if $routeStore.waypoints.length < ROUTING_MAX_WAYPOINTS}
    <button class="px-2 py-1 bg-blue-500 text-white" on:click={routeStore.addWaypoint}>+ Stopp hinzufügen</button>
  {:else}
    <p class="text-sm text-gray-600">Maximale Wegpunkte erreicht ({ROUTING_MAX_WAYPOINTS})</p>
  {/if}
  <div class="space-x-2">
    <button class="px-2 py-1 bg-green-600 text-white" on:click={calculateRoute} disabled={routing}>
      Route berechnen
    </button>
    <button
      class="px-2 py-1 bg-purple-600 text-white"
      on:click={exportGpx}
      disabled={!$routeStore.route}
    >
      Als GPX exportieren
    </button>
  </div>
  {#if $routeStore.distanceKm}
    <p class="text-sm">Distanz: {$routeStore.distanceKm?.toFixed(2)} km</p>
  {/if}
  {#if $routeStore.durationMin}
    <p class="text-sm">Dauer: {$routeStore.durationMin?.toFixed(1)} min</p>
  {/if}
  <div class="flex items-center space-x-2">
    <input type="checkbox" bind:checked={corridorOnly} id="corridor" />
    <label for="corridor" class="text-sm">Nur Routenkorridor laden (Straßen/Flüsse)</label>
  </div>
  {#if elevLoading}
    <p class="text-sm">H\u00f6henprofil wird geladen...</p>
  {/if}
  {#if elevError}
    <p class="text-sm text-red-600">{elevError}</p>
  {/if}
  {#if $routeStore.elevations}
    <ElevationChart
      elevations={$routeStore.elevations}
      stats={$routeStore.elevationStats}
      distanceKm={$routeStore.distanceKm}
    />
  {/if}
  {#if error}
    <p class="text-sm text-red-600">{error}</p>
  {/if}
</div>
