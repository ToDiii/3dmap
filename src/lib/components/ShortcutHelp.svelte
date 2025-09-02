<script lang="ts">
	import { shortcutHelpStore, closeHelp } from '$lib/stores/shortcutHelpStore';
	import { getShortcuts } from '$lib/controls/shortcuts';
	const groups = () => {
		const map: Record<string, ReturnType<typeof getShortcuts>> = {} as any;
		for (const sc of getShortcuts()) {
			if (sc.enabled && !sc.enabled()) continue;
			if (!map[sc.group]) map[sc.group] = [] as any;
			(map[sc.group] as any).push(sc);
		}
		return map as Record<string, any[]>;
	};
	let grouped: Record<string, any[]> = {};
	$: if ($shortcutHelpStore) grouped = groups();

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			closeHelp();
		}
	}
</script>

{#if $shortcutHelpStore}
	<div
		class="sh-backdrop"
		role="dialog"
		aria-modal="true"
		aria-label="Shortcut Hilfe"
		on:keydown={handleKey}
		tabindex="0"
	>
		<div class="sh">
			<button class="sh-close" on:click={closeHelp}>×</button>
			{#each Object.keys(grouped) as g (g)}
				<h2>{g}</h2>
				<table>
					{#each grouped[g] as sc (sc.id)}
						<tr>
							<td>{sc.title}</td>
							<td><kbd>{sc.combo}</kbd></td>
						</tr>
					{/each}
				</table>
			{/each}
		</div>
	</div>
{/if}

<style>
	.sh-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 5vh;
		z-index: 1000;
	}
	.sh {
		background: white;
		padding: 1rem;
		max-height: 80vh;
		overflow: auto;
		border-radius: 4px;
		min-width: 300px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1rem;
	}
	td {
		padding: 0.25rem 0.5rem;
		border-bottom: 1px solid #eee;
	}
	kbd {
		background: #eee;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		font-size: 0.9rem;
	}
	.sh-close {
		float: right;
		background: none;
		border: none;
		font-size: 1.2rem;
	}
</style>
