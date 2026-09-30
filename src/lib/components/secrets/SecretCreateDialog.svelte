<script lang="ts">
	import type { Secret } from '$lib/types/secrets.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { Plus, PencilSimple, CircleNotch, MagicWand } from 'phosphor-svelte';

	interface Props {
		open?: boolean;
		editSecret?: Secret | null;
		onSuccess?: () => void;
		onClose?: () => void;
	}

	let { open = $bindable(false), editSecret = null, onSuccess, onClose }: Props = $props();

	let isEdit = $derived(Boolean(editSecret));

	let name = $state('');
	let description = $state('');
	let secretValue = $state('');
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		if (open) {
			if (editSecret) {
				name = editSecret.name;
				description = editSecret.description || '';
				loadSecretValueForEdit(editSecret.name);
			} else {
				name = '';
				description = '';
				secretValue = '{\n  \n}';
				errorMessage = null;
			}
		}
	});

	async function loadSecretValueForEdit(secretName: string) {
		loading = true;
		errorMessage = null;
		try {
			const res = await fetch(`/api/secrets-manager/${encodeURIComponent(secretName)}`);
			if (res.ok) {
				const json = await res.json();
				const val = json.data?.value;
				if (typeof val === 'object') {
					secretValue = JSON.stringify(val, null, 2);
				} else {
					secretValue = String(val ?? '');
				}
			}
		} catch (err: unknown) {
			console.error('Failed to load secret value for edit:', err);
		} finally {
			loading = false;
		}
	}

	function handleFormatJson() {
		try {
			const parsed = JSON.parse(secretValue);
			secretValue = JSON.stringify(parsed, null, 2);
			errorMessage = null;
		} catch (err) {
			errorMessage = 'Current content is not valid JSON to format.';
		}
	}

	async function handleSubmit() {
		if (!name.trim()) {
			errorMessage = 'Secret name is required.';
			return;
		}

		if (!secretValue) {
			errorMessage = 'Secret value is required.';
			return;
		}

		loading = true;
		errorMessage = null;

		try {
			let parsedValue: unknown = secretValue;
			try {
				parsedValue = JSON.parse(secretValue);
			} catch {
				// Keep as raw string if not JSON
			}

			if (isEdit) {
				const res = await fetch(`/api/secrets-manager/${encodeURIComponent(name)}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ value: parsedValue })
				});

				const result = await res.json();
				if (!res.ok || !result.success) {
					throw new Error(result.error || 'Failed to update secret');
				}
			} else {
				const res = await fetch('/api/secrets-manager', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: name.trim(),
						description: description.trim() || undefined,
						value: parsedValue
					})
				});

				const result = await res.json();
				if (!res.ok || !result.success) {
					throw new Error(result.error || 'Failed to create secret');
				}
			}

			open = false;
			onSuccess?.();
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Operation failed';
		} finally {
			loading = false;
		}
	}

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

<Dialog bind:open onOpenChange={(val) => !val && handleClose()}>
	<DialogContent class="max-w-lg bg-[var(--card)] border-[var(--border)]">
		<DialogHeader>
			<DialogTitle class="font-serif text-lg font-semibold flex items-center gap-2 text-foreground">
				{#if isEdit}
					<PencilSimple weight="bold" class="size-4 text-stone-500" />
					Edit Secret: {editSecret?.name}
				{:else}
					<Plus weight="bold" class="size-4 text-stone-500" />
					Create New Secret
				{/if}
			</DialogTitle>
			<DialogDescription class="text-xs text-muted-foreground font-sans">
				Configure secret keys and values stored securely inside AWS Secrets Manager.
			</DialogDescription>
		</DialogHeader>

		{#if errorMessage}
			<div class="p-2.5 rounded bg-[var(--pastel-red-bg)] text-[var(--pastel-red-text)] border border-[var(--pastel-red-border)] text-xs">
				{errorMessage}
			</div>
		{/if}

		<div class="space-y-3 py-2 text-xs">
			<!-- Name Field -->
			<div class="space-y-1">
				<Label class="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
					Secret Name *
				</Label>
				<Input
					bind:value={name}
					disabled={isEdit || loading}
					placeholder="e.g. pas-admission or pay-gateway"
					class="h-8 text-xs font-mono bg-[var(--background)] border-[var(--border)]"
				/>
			</div>

			<!-- Description Field -->
			{#if !isEdit}
				<div class="space-y-1">
					<Label class="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
						Description (Optional)
					</Label>
					<Input
						bind:value={description}
						disabled={loading}
						placeholder="Service configuration and credentials"
						class="h-8 text-xs bg-[var(--background)] border-[var(--border)]"
					/>
				</div>
			{/if}

			<!-- Secret Value Field -->
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<Label class="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
						Secret Value (Plaintext or JSON) *
					</Label>
					<Button
						variant="ghost"
						size="sm"
						class="h-6 px-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground"
						onclick={handleFormatJson}
						type="button"
					>
						<MagicWand weight="bold" class="size-3 mr-1" />
						Prettify JSON
					</Button>
				</div>
				<Textarea
					bind:value={secretValue}
					disabled={loading}
					rows={8}
					class="font-mono text-xs bg-[var(--background)] border-[var(--border)]"
					placeholder="Enter JSON object or string value..."
				/>
			</div>
		</div>

		<DialogFooter class="flex justify-end gap-2">
			<Button variant="outline" size="sm" onclick={handleClose} disabled={loading} class="text-xs border-[var(--border)]">
				Cancel
			</Button>

			<Button
				variant="default"
				size="sm"
				onclick={handleSubmit}
				disabled={loading}
				class="text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437]"
			>
				{#if loading}
					<CircleNotch weight="bold" class="size-3.5 mr-1.5 animate-spin" />
					Saving...
				{:else}
					{isEdit ? 'Update Secret' : 'Create Secret'}
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
