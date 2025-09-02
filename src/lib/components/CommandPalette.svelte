<script lang="ts">
	import { onMount } from 'svelte';
	import { commandPaletteStore, closePalette, setQuery } from '$lib/stores/commandPaletteStore';
	import { filterShortcuts, type Shortcut } from '$lib/controls/shortcuts';

	let inputEl: HTMLInputElement | null = null;
	let results: Shortcut[] = [];
	let active = 0;

	function updateResults(q: string) {
		results = filterShortcuts(q);
		active = 0;
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = (active + 1) % results.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = (active - 1 + results.length) % results.length;
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const cmd = results[active];
			if (cmd) {
				cmd.run();
				closePalette();
			}
		} else if (e.key === 'Escape') {
			e.preventDefault();
			closePalette();
		}
	}

	$: if ($commandPaletteStore.open) {
		onMount(() => {
			setTimeout(() => inputEl?.focus(), 0);
			updateResults($commandPaletteStore.query);
		});
	}
</script>

{#if $commandPaletteStore.open}
	<div class="cp-backdrop" role="dialog" aria-modal="true" aria-label="Befehle">
		<div class="cp" on:keydown={handleKey}>
			<input
				bind:this={inputEl}
				class="cp-input"
				placeholder="Befehl suchen"
				value={$commandPaletteStore.query}
				on:input={(e) => {
					const v = (e.target as HTMLInputElement).value;
					setQuery(v);
					updateResults(v);
				}}
			/>
			<ul class="cp-list">
				{#each results as r, i (r.id)}
					<li class:selected={i === active}>
						<span>{r.title}</span>
						<span class="cp-combo">{r.combo}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	.cp-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 10vh;
		z-index: 1000;
	}
	.cp {
		background: white;
		width: 400px;
		max-height: 60vh;
		border-radius: 4px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.cp-input {
		padding: 0.5rem;
		border: none;
		border-bottom: 1px solid #ddd;
		outline: none;
	}
	.cp-list {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow-y: auto;
	}
	.cp-list li {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem;
	}
	.cp-list li.selected {
		background: #eee;
	}
	.cp-combo {
		font-size: 0.8rem;
		color: #666;
	}
</style>
