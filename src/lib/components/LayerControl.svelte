<script lang="ts">
  import { mapStore } from '$lib/stores/map';
  import { LAYERS } from '$lib/constants/layers';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';

  type LayerKey = keyof typeof LAYERS;

  const layerOptions: { key: LayerKey; label: string }[] = [
    { key: 'building', label: 'Gebäude' },
    { key: 'water', label: 'Gewässer' },
    { key: 'green', label: 'Grünflächen' },
    { key: 'road', label: 'Straßen' }
  ];

  let visibility: Record<LayerKey, boolean> = {
    building: true,
    water: true,
    green: true,
    road: true
  };

  let reduceDetails = false;

  function applyVisibility(key: LayerKey) {
    const map = get(mapStore);
    if (!map) return;
    const def = LAYERS[key];
    def.ids.forEach((id) =>
      map.setLayoutProperty(id, 'visibility', visibility[key] ? 'visible' : 'none')
    );
  }

  function applyDetailFilter() {
    const map = get(mapStore);
    if (!map) return;
    Object.entries(LAYERS).forEach(([key, def]) => {
      if (def.detailFilter) {
        def.ids.forEach((id) => {
          map.setFilter(id, reduceDetails ? def.detailFilter! : null);
        });
      }
    });
  }

  onMount(() => {
    const map = get(mapStore);
    if (map) {
      (Object.keys(visibility) as LayerKey[]).forEach((k) => applyVisibility(k));
    }
  });

  mapStore.subscribe((map) => {
    if (map) {
      (Object.keys(visibility) as LayerKey[]).forEach((k) => applyVisibility(k));
      applyDetailFilter();
    }
  });
</script>

<div class="space-y-4">
  {#each layerOptions as { key, label }}
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={visibility[key]} on:change={() => applyVisibility(key)} />
      <span>{label}</span>
    </label>
  {/each}
  <div class="pt-4 border-t">
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={reduceDetails} on:change={applyDetailFilter} />
      <span>Details reduzieren</span>
    </label>
  </div>
</div>
