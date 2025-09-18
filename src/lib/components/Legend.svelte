<script lang="ts">
	import { SLOPE_GRADIENT } from '$lib/constants/palette';
	import { colorPalette } from '$lib/stores/colorPalette';
</script>

<div class="space-y-2 text-sm">
	<div class="flex items-center gap-2">
		<span class="h-4 w-4" style="background:{$colorPalette.buildingResidential}"></span>
		Wohnen
	</div>
	<div class="flex items-center gap-2">
		<span class="h-4 w-4" style="background:{$colorPalette.buildingCommercial}"></span>
		Gewerbe
	</div>
	<div class="flex items-center gap-2">
		<span class="h-4 w-4" style="background:{$colorPalette.buildingIndustrial}"></span>
		Industrie
	</div>
	<div class="flex items-center gap-2">
		<span class="h-4 w-4" style="background:{$colorPalette.water}"></span>
		Wasser
	</div>
	<div class="flex items-center gap-2">
		<span class="h-4 w-4" style="background:{$colorPalette.greenery}"></span>
		Grün
	</div>
	<div class="mt-2">
		<div class="mb-1">Route (Steigung)</div>
		<div class="flex">
			{#each SLOPE_GRADIENT as stop (stop.color)}
				<div class="h-2 flex-1" style="background:{stop.color}"></div>
			{/each}
		</div>
		<div class="flex justify-between text-[10px]">
			{#each SLOPE_GRADIENT as stop (stop.color)}
				<span>{Math.round(stop.pct * 100)}%</span>
			{/each}
		</div>
	</div>
</div>
