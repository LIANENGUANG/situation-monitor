<script lang="ts">
	import { refresh, isRefreshing, lastRefresh, autoRefreshEnabled } from '$lib/stores';
	import { timeAgo } from '$lib/utils';

	interface Props {
		onRefresh?: () => void;
		onSettingsClick?: () => void;
	}

	let { onRefresh, onSettingsClick }: Props = $props();

	function handleRefresh() {
		if (onRefresh && !$isRefreshing) {
			onRefresh();
		}
	}

	function handleToggleAutoRefresh() {
		refresh.toggleAutoRefresh(onRefresh);
	}

	const lastRefreshText = $derived(
		$lastRefresh ? `Last: ${timeAgo($lastRefresh)}` : 'Never refreshed'
	);
</script>

<header class="header">
	<div class="header-left">
		<h1 class="logo">SITUATION MONITOR</h1>
		<span class="version">v2.0</span>
	</div>

	<div class="header-center">
		<div class="refresh-status">
			{#if $isRefreshing}
				<span class="status-text loading">Refreshing...</span>
			{:else}
				<span class="status-text">{lastRefreshText}</span>
			{/if}
		</div>
	</div>

	<div class="header-right">
		<button
			class="header-btn"
			class:active={$autoRefreshEnabled}
			onclick={handleToggleAutoRefresh}
			title={$autoRefreshEnabled ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
		>
			<span class="btn-icon">⟳</span>
			<span class="btn-label">{$autoRefreshEnabled ? 'Auto' : 'Manual'}</span>
		</button>

		<button
			class="header-btn refresh-btn"
			onclick={handleRefresh}
			disabled={$isRefreshing}
			title="Refresh all data"
		>
			<span class="btn-icon" class:spinning={$isRefreshing}>↻</span>
			<span class="btn-label">Refresh</span>
		</button>

		<button class="header-btn settings-btn" onclick={onSettingsClick} title="Settings">
			<span class="btn-icon">⚙</span>
			<span class="btn-label">Settings</span>
		</button>
	</div>
</header>

<style>
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-left {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.logo {
		font-size: 0.9rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: var(--text-primary);
		margin: 0;
	}

	.version {
		font-size: 0.6rem;
		color: var(--text-muted);
	}

	.header-center {
		display: flex;
		align-items: center;
	}

	.refresh-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-text {
		font-size: 0.65rem;
		color: var(--text-secondary);
	}

	.status-text.loading {
		color: var(--accent);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0.6rem;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		font-size: 0.65rem;
	}

	.header-btn:hover:not(:disabled) {
		background: var(--border);
		color: var(--text-primary);
	}

	.header-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.header-btn.active {
		background: rgba(var(--accent-rgb), 0.1);
		border-color: var(--accent);
		color: var(--accent);
	}

	.btn-icon {
		font-size: 0.8rem;
	}

	.btn-icon.spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.btn-label {
		display: none;
	}

	@media (min-width: 768px) {
		.btn-label {
			display: inline;
		}
	}
</style>
