<script lang="ts">
	import { onDestroy } from 'svelte';
	import { modelConfigStore } from '$lib/stores/modelConfigStore';

	const scales = [500, 1000, 2500, 5000];

	let scale = 500;
	let baseHeight = 0;
	let buildingMultiplier = 1;
	let elements = {
		buildings: true,
		roads: true,
		water: true,
		green: true,
	};
	let excludeSmallBuildings = false;
	let minBuildingArea = 50;

	const unsubscribe = modelConfigStore.subscribe((value) => {
		scale = value.scale;
		baseHeight = value.baseHeight;
		buildingMultiplier = value.buildingMultiplier;
		elements = { ...value.elements };
		excludeSmallBuildings = value.excludeSmallBuildings;
		minBuildingArea = value.minBuildingArea;
	});

	onDestroy(unsubscribe);

	function updateStore() {
		modelConfigStore.set({
			scale,
			baseHeight,
			buildingMultiplier,
			elements: { ...elements },
			excludeSmallBuildings,
			minBuildingArea,
		});
	}
</script>

<div class="space-y-4">
	<div>
		<label class="mb-1 block text-sm font-medium" for="scaleSelect" title="Maßstab des Modells"
			>Maßstab</label
		>
		<select id="scaleSelect" class="w-full border p-1" bind:value={scale} on:change={updateStore}>
			{#each scales as s (s)}
				<option value={s}>1:{s}</option>
			{/each}
		</select>
	</div>

	<div>
		<label
			class="mb-1 block text-sm font-medium"
			for="baseHeight"
			title="Versenkt oder hebt das Modell an">Basishöhe (m)</label
		>
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
			class="mb-1 block text-sm font-medium"
			for="heightMultiplier"
			title="Skaliert die Gebäudehöhen"
			>Gebäudehöhe-Multiplikator: {buildingMultiplier.toFixed(1)}x</label
		>
		<input
			id="heightMultiplier"
			type="range"
			min="0.5"
			max="5"
			step="0.1"
			class="w-full"
			bind:value={buildingMultiplier}
			on:input={updateStore}
		/>
	</div>

	<fieldset>
		<legend class="mb-1 block text-sm font-medium">Elementauswahl</legend>
		<div class="space-y-1">
			<label class="flex items-center space-x-2">
				<input type="checkbox" bind:checked={elements.buildings} on:change={updateStore} />
				<span>Gebäude</span>
			</label>
			<label class="flex items-center space-x-2">
				<input type="checkbox" bind:checked={elements.roads} on:change={updateStore} />
				<span>Straßen</span>
			</label>
			<label class="flex items-center space-x-2">
				<input type="checkbox" bind:checked={elements.water} on:change={updateStore} />
				<span>Gewässer</span>
			</label>
			<label class="flex items-center space-x-2">
				<input type="checkbox" bind:checked={elements.green} on:change={updateStore} />
				<span>Grünflächen</span>
			</label>
			<label class="flex items-center space-x-2" title="Blendet kleine Gebäude aus">
				<input type="checkbox" bind:checked={excludeSmallBuildings} on:change={updateStore} />
				<span>Gebäude unter</span>
				<input
					type="number"
					class="w-16 border p-1 text-xs"
					min="0"
					bind:value={minBuildingArea}
					on:input={updateStore}
				/>
				<span>m² ausschließen</span>
			</label>
		</div>
	</fieldset>
</div>
