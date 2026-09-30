<script lang="ts">
	import type { Secret } from '$lib/types/secrets.js';
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle
	} from '$lib/components/ui/alert-dialog/index.js';
	import { Trash, WarningCircle, CircleNotch } from 'phosphor-svelte';

	interface Props {
		open?: boolean;
		secret: Secret | null;
		onSuccess?: () => void;
		onClose?: () => void;
	}

	let { open = $bindable(false), secret, onSuccess, onClose }: Props = $props();

	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	async function handleConfirmDelete() {
		if (!secret?.name) return;

		loading = true;
		errorMessage = null;

		try {
			const res = await fetch(`/api/secrets-manager/${encodeURIComponent(secret.name)}`, {
				method: 'DELETE'
			});

			const result = await res.json();
			if (!res.ok || !result.success) {
				throw new Error(result.error || 'Failed to delete secret');
			}

			open = false;
			onSuccess?.();
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Deletion failed';
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		open = false;
		errorMessage = null;
		onClose?.();
	}
</script>

<AlertDialog bind:open onOpenChange={(val) => !val && handleClose()}>
	<AlertDialogContent class="max-w-md bg-[var(--card)] border-[var(--border)]">
		<AlertDialogHeader>
			<AlertDialogTitle class="font-serif text-lg font-semibold flex items-center gap-2 text-[var(--pastel-red-text)]">
				<WarningCircle weight="bold" class="size-4 shrink-0" />
				Confirm Secret Deletion
			</AlertDialogTitle>
			<AlertDialogDescription class="text-xs text-muted-foreground font-sans">
				Are you sure you want to delete secret <code class="font-mono text-foreground font-semibold">{secret?.name}</code>?
				This schedules deletion with AWS Secrets Manager with a 7-day recovery window.
			</AlertDialogDescription>
		</AlertDialogHeader>

		{#if errorMessage}
			<div class="p-2.5 rounded bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)] border border-[var(--pastel-red-border)] text-xs font-mono">
				{errorMessage}
			</div>
		{/if}

		<AlertDialogFooter class="flex justify-end gap-2">
			<AlertDialogCancel onclick={handleClose} disabled={loading} class="text-xs border-[var(--border)]">
				Cancel
			</AlertDialogCancel>
			<AlertDialogAction
				onclick={handleConfirmDelete}
				disabled={loading}
				class="text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437] font-medium"
			>
				{#if loading}
					<CircleNotch weight="bold" class="size-3.5 mr-1.5 animate-spin" />
					Deleting...
				{:else}
					<Trash weight="bold" class="size-3.5 mr-1.5" />
					Delete Secret
				{/if}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
