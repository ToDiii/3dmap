<script lang="ts">
	import { collectCurrentState } from '$lib/state/bridge';
	import { serialize, MAX_STATE_SIZE } from '$lib/state/serialize';
	import { writeToUrl } from '$lib/state/url';
	import { browser } from '$app/environment';
	let notice: string | null = null;
	let length = 0;

	async function copyLink() {
		if (!browser) return;
		const s = serialize(collectCurrentState());
		length = s.length;
		writeToUrl(s, true);
		await navigator.clipboard.writeText(location.href);
		notice = 'Link kopiert';
		setTimeout(() => (notice = null), 2000);
	}
</script>

<div class="space-y-1">
	<button class="w-full bg-blue-600 p-2 text-white" on:click={copyLink}> 🔗 Link kopieren </button>
	<div class="text-xs text-gray-600">({length} Zeichen)</div>
	{#if length > MAX_STATE_SIZE}
		<div class="text-xs text-red-600">Warnung: Link könnte zu lang sein</div>
	{/if}
	{#if notice}
		<div class="text-sm text-green-700">{notice}</div>
	{/if}
</div>
