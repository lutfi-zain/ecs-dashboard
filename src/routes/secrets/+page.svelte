<script lang="ts">
	import type { PageData } from './$types.js';
	import type { Secret } from '$lib/types/secrets.js';
	import SecretsTable from '$lib/components/secrets/SecretsTable.svelte';
	import SecretViewDrawer from '$lib/components/secrets/SecretViewDrawer.svelte';
	import SecretCreateDialog from '$lib/components/secrets/SecretCreateDialog.svelte';
	import SecretDeleteConfirm from '$lib/components/secrets/SecretDeleteConfirm.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { WarningCircle } from 'phosphor-svelte';
	import { onMount } from 'svelte';

	let { data }: { data: PageData } = $props();

	// State
	let clientSecrets = $state<Secret[] | null>(null);
	let secrets = $derived(clientSecrets ?? data.secrets);

	let clientError = $state<string | null>(null);
	let errorState = $derived(clientError ?? data.error);

	let loading = $state(false);

	// Modals State
	let viewDrawerOpen = $state(false);
	let selectedViewSecret = $state<Secret | null>(null);

	let createDialogOpen = $state(false);
	let editingSecret = $state<Secret | null>(null);

	let deleteDialogOpen = $state(false);
	let deletingSecret = $state<Secret | null>(null);

	async function refreshSecrets() {
		loading = true;
		try {
			const res = await fetch('/api/secrets-manager');
			if (res.ok) {
				const json = await res.json();
				clientSecrets = json.data || [];
				clientError = null;
			} else {
				const err = await res.json();
				clientError = err.error || 'Failed to refresh secrets list';
			}
		} catch (err: unknown) {
			clientError = err instanceof Error ? err.message : 'Network error refreshing secrets';
		} finally {
			loading = false;
		}
	}

	function handleOpenView(secret: Secret) {
		selectedViewSecret = secret;
		viewDrawerOpen = true;
	}

	function handleOpenCreate() {
		editingSecret = null;
		createDialogOpen = true;
	}

	function handleOpenEdit(secret: Secret) {
		editingSecret = secret;
		createDialogOpen = true;
	}

	function handleOpenDelete(secret: Secret) {
		deletingSecret = secret;
		deleteDialogOpen = true;
	}

	onMount(() => {
		const onGlobalRefresh = () => {
			refreshSecrets();
		};
		window.addEventListener('app:refresh', onGlobalRefresh);
		return () => {
			window.removeEventListener('app:refresh', onGlobalRefresh);
		};
	});
</script>

<svelte:head>
	<title>AWS Secrets Manager</title>
</svelte:head>

<div class="space-y-6">
	<!-- Error Banner if any -->
	{#if errorState}
		<Alert variant="destructive" class="border border-[var(--pastel-red-border)] bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)]">
			<WarningCircle weight="bold" class="size-4" />
			<AlertTitle class="font-serif">Secrets Manager Notice</AlertTitle>
			<AlertDescription class="text-xs font-mono">
				{errorState}
			</AlertDescription>
		</Alert>
	{/if}

	<!-- Secrets Table Section -->
	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="font-serif text-lg font-semibold text-foreground">
					Managed Secrets
				</h2>
				<p class="text-xs text-muted-foreground font-mono">
					{secrets.length} secrets retrieved from AWS Secrets Manager
				</p>
			</div>
		</div>

		<SecretsTable
			{secrets}
			{loading}
			onViewSecret={handleOpenView}
			onEditSecret={handleOpenEdit}
			onDeleteSecret={handleOpenDelete}
			onCreateSecret={handleOpenCreate}
			onRefresh={refreshSecrets}
		/>
	</section>
</div>

<!-- View Secret Content Drawer -->
<SecretViewDrawer
	bind:open={viewDrawerOpen}
	secret={selectedViewSecret}
	onEdit={handleOpenEdit}
	onClose={() => (selectedViewSecret = null)}
/>

<!-- Create / Edit Secret Dialog -->
<SecretCreateDialog
	bind:open={createDialogOpen}
	editSecret={editingSecret}
	onSuccess={refreshSecrets}
	onClose={() => (editingSecret = null)}
/>

<!-- Delete Secret Confirmation Dialog -->
<SecretDeleteConfirm
	bind:open={deleteDialogOpen}
	secret={deletingSecret}
	onSuccess={refreshSecrets}
	onClose={() => (deletingSecret = null)}
/>
