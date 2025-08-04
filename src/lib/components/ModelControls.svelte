<script lang="ts">
  import { onDestroy } from 'svelte';
  import { modelConfigStore } from '$lib/stores/modelConfigStore';

  const scales = [500, 1000, 2500, 5000];

  let scale = 500;
  let baseHeight = 0;
  let buildingHeightMultiplier = 1;
  let elements = {
    buildings: true,
    roads: true,
    water: true,
    green: true
  };

  const unsubscribe = modelConfigStore.subscribe((value) => {
    scale = value.scale;
    baseHeight = value.baseHeight;
    buildingHeightMultiplier = value.buildingHeightMultiplier;
    elements = { ...value.elements };
  });

  onDestroy(unsubscribe);

  function updateStore() {
    modelConfigStore.set({
      scale,
      baseHeight,
      buildingHeightMultiplier,
      elements: { ...elements }
    });
  }
</script>

<div class="space-y-4">
  <div>
    <label class="block text-sm font-medium mb-1" for="scaleSelect">Maßstab</label>
    <select
      id="scaleSelect"
      class="w-full border p-1"
      bind:value={scale}
      on:change={updateStore}
    >
      {#each scales as s}
        <option value={s}>1:{s}</option>
      {/each}
    </select>
  </div>

  <div>
    <label class="block text-sm font-medium mb-1" for="baseHeight">Basishöhe (m)</label>
    <input
      id="baseHeight"
      type="number"
      min="-100"
      max="100"
      class="w-full border p-1"
      bind:value={baseHeight}
      on:input={updateStore}
    />
  </div>

  <div>
    <label
      class="block text-sm font-medium mb-1"
      for="heightMultiplier"
      >Gebäudehöhe-Multiplikator: {buildingHeightMultiplier}</label
    >
    <input
      id="heightMultiplier"
      type="range"
      min="0.5"
      max="3"
      step="0.1"
      class="w-full"
      bind:value={buildingHeightMultiplier}
      on:input={updateStore}
    />
  </div>

  <fieldset>
    <legend class="block text-sm font-medium mb-1">Elementauswahl</legend>
    <div class="space-y-1">
      <label class="flex items-center space-x-2">
        <input
          type="checkbox"
          bind:checked={elements.buildings}
          on:change={updateStore}
        />
        <span>Gebäude</span>
      </label>
      <label class="flex items-center space-x-2">
        <input
          type="checkbox"
          bind:checked={elements.roads}
          on:change={updateStore}
        />
        <span>Straßen</span>
      </label>
      <label class="flex items-center space-x-2">
        <input
          type="checkbox"
          bind:checked={elements.water}
          on:change={updateStore}
        />
        <span>Gewässer</span>
      </label>
      <label class="flex items-center space-x-2">
        <input
          type="checkbox"
          bind:checked={elements.green}
          on:change={updateStore}
        />
        <span>Grünflächen</span>
      </label>
    </div>
  </fieldset>
</div>
