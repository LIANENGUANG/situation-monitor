<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Drag-drop state and handlers will be added in Phase 4
	// when panels are fully implemented
</script>

<main class="dashboard">
	<div class="dashboard-grid">
		{@render children()}
	</div>
</main>

<style>
	.dashboard {
		flex: 1;
		padding: 0.5rem;
		overflow-y: auto;
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.5rem;
		max-width: 2000px;
		margin: 0 auto;
	}

	@media (min-width: 1200px) {
		.dashboard-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	@media (min-width: 1600px) {
		.dashboard-grid {
			grid-template-columns: repeat(5, 1fr);
		}
	}

	@media (min-width: 2000px) {
		.dashboard-grid {
			grid-template-columns: repeat(6, 1fr);
		}
	}
</style>
