<script lang="ts">
  import { COLORS, SLOPE_GRADIENT } from '$lib/constants/palette';
</script>

<div class="space-y-2 text-sm">
  <div class="flex items-center gap-2">
    <span class="w-4 h-4" style="background:{COLORS.building_residential}"></span>
    Wohnen
  </div>
  <div class="flex items-center gap-2">
    <span class="w-4 h-4" style="background:{COLORS.building_commercial}"></span>
    Gewerbe
  </div>
  <div class="flex items-center gap-2">
    <span class="w-4 h-4" style="background:{COLORS.building_industrial}"></span>
    Industrie
  </div>
  <div class="flex items-center gap-2">
    <span class="w-4 h-4" style="background:{COLORS.water}"></span>
    Wasser
  </div>
  <div class="flex items-center gap-2">
    <span class="w-4 h-4" style="background:{COLORS.green}"></span>
    Grün
  </div>
  <div class="mt-2">
    <div class="mb-1">Route (Steigung)</div>
    <div class="flex">
      {#each SLOPE_GRADIENT as stop}
        <div class="h-2 flex-1" style="background:{stop.color}"></div>
      {/each}
    </div>
    <div class="flex justify-between text-[10px]">
      {#each SLOPE_GRADIENT as stop}
        <span>{Math.round(stop.pct * 100)}%</span>
      {/each}
    </div>
  </div>
</div>
