<script lang="ts">
  export let elevations: number[] = [];
  export let stats: { min: number; max: number; gain: number; loss: number } | undefined;
  export let distanceKm: number | undefined;

  const width = 300;
  const height = 100;
  let tooltip: { x: number; y: number; dist: number; elev: number; slope: number } | null = null;

  $: points = (() => {
    if (!elevations.length) return '';
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const dx = width / (elevations.length - 1);
    const dy = height / (max - min || 1);
    return elevations
      .map((e, i) => `${i * dx},${height - (e - min) * dy}`)
      .join(' ');
  })();

  function handleMove(e: MouseEvent) {
    if (!elevations.length) return;
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round((x / width) * (elevations.length - 1));
    const elev = elevations[idx];
    const total = (distanceKm || 0) * 1000;
    const dist = (idx / (elevations.length - 1)) * total;
    const prev = elevations[idx - 1] ?? elev;
    const slope = ((elev - prev) / (total / (elevations.length - 1))) * 100;
    tooltip = { x, y: height - ((elev - Math.min(...elevations)) * height) / (Math.max(...elevations) - Math.min(...elevations) || 1), dist, elev, slope };
  }

  function handleLeave() {
    tooltip = null;
  }
</script>

<svg {width} {height} class="border" on:mousemove={handleMove} on:mouseleave={handleLeave}>
  {#if points}
    <polyline fill="none" stroke="blue" stroke-width="1" points={points} />
  {/if}
  {#if tooltip}
    <circle cx={tooltip.x} cy={tooltip.y} r="3" fill="red" />
  {/if}
</svg>
{#if tooltip}
  <div class="text-xs">
    Distanz: {(tooltip.dist / 1000).toFixed(2)} km,
    Höhe: {tooltip.elev.toFixed(0)} m,
    Steigung: {tooltip.slope.toFixed(1)}%
  </div>
{/if}
{#if stats}
  <p class="text-xs">Gain: {stats.gain.toFixed(0)} m / Loss: {stats.loss.toFixed(0)} m</p>
{/if}
