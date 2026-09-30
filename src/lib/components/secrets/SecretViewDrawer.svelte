<script lang="ts">
	import type { Secret } from '$lib/types/secrets.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Sheet,
		SheetContent,
		SheetDescription,
		SheetHeader,
		SheetTitle
	} from '$lib/components/ui/sheet/index.js';
	import { Copy, Check, Key, CircleNotch, PencilSimple } from 'phosphor-svelte';

	interface Props {
		open?: boolean;
		secret: Secret | null;
		onEdit?: (secret: Secret) => void;
		onClose?: () => void;
	}

	let { open = $bindable(false), secret, onEdit, onClose }: Props = $props();

	let loading = $state(false);
	let secretValue = $state<string>('');
	let copied = $state(false);
	let errorMessage = $state<string | null>(null);

	$effect(() => {
		if (open && secret?.name) {
			fetchSecretValue(secret.name);
		} else {
			secretValue = '';
			errorMessage = null;
		}
	});

	async function fetchSecretValue(name: string) {
		loading = true;
		errorMessage = null;
		try {
			const res = await fetch(`/api/secrets-manager/${encodeURIComponent(name)}`);
			if (res.ok) {
				const json = await res.json();
				const val = json.data?.value;
				if (typeof val === 'object') {
					secretValue = JSON.stringify(val, null, 2);
				} else {
					secretValue = String(val ?? '');
				}
			} else {
				const err = await res.json();
				errorMessage = err.error || 'Failed to retrieve secret content';
			}
		} catch (err: unknown) {
			errorMessage = err instanceof Error ? err.message : 'Network error loading secret';
		} finally {
			loading = false;
		}
	}

	async function handleCopy() {
		if (!secretValue) return;
		await navigator.clipboard.writeText(secretValue);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

<Sheet bind:open onOpenChange={(val) => !val && handleClose()}>
	<SheetContent side="right" class="w-full sm:max-w-lg bg-[var(--card)] border-[var(--border)] flex flex-col p-6">
		<SheetHeader class="space-y-1">
			<SheetTitle class="font-serif text-lg font-semibold flex items-center gap-2 text-foreground truncate">
				<Key weight="bold" class="size-4 text-stone-500 shrink-0" />
				<span class="truncate">{secret?.name}</span>
			</SheetTitle>
			<SheetDescription class="text-xs font-mono text-muted-foreground break-all">
				{secret?.arn}
			</SheetDescription>
		</SheetHeader>

		<div class="flex-1 flex flex-col py-4 space-y-4 overflow-hidden">
			<!-- Metadata details -->
			<div class="grid grid-cols-2 gap-2 text-xs font-mono border-y border-[var(--border)] py-2 text-muted-foreground">
				<div>
					<span class="text-[10px] uppercase block tracking-wider">Last Changed</span>
					<span class="text-foreground font-medium">
						{secret?.lastChangedDate ? new Date(secret.lastChangedDate).toLocaleString() : '—'}
					</span>
				</div>
				<div>
					<span class="text-[10px] uppercase block tracking-wider">Last Accessed</span>
					<span class="text-foreground font-medium">
						{secret?.lastAccessedDate ? new Date(secret.lastAccessedDate).toLocaleDateString() : '—'}
					</span>
				</div>
			</div>

			<!-- Secret Value Surface -->
			<div class="flex-1 flex flex-col min-h-0 space-y-1.5">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-foreground font-mono uppercase tracking-wider">
						Secret Content
					</span>
					<Button
						variant="ghost"
						size="sm"
						class="h-7 px-2 text-xs text-muted-foreground hover:text-foreground font-mono"
						onclick={handleCopy}
						disabled={loading || !secretValue}
					>
						{#if copied}
							<Check weight="bold" class="size-3.5 mr-1 text-[var(--pastel-green-text)]" />
							<span>Copied</span>
						{:else}
							<Copy weight="bold" class="size-3.5 mr-1" />
							<span>Copy Value</span>
						{/if}
					</Button>
				</div>

				<div class="flex-1 overflow-auto rounded border border-[var(--border)] bg-[var(--background)] p-3 relative font-mono text-xs text-foreground">
					{#if loading}
						<div class="h-full flex items-center justify-center text-muted-foreground gap-2">
							<CircleNotch weight="bold" class="size-4 animate-spin" />
							<span>Retrieving secret from AWS...</span>
						</div>
					{:else if errorMessage}
						<div class="text-[var(--pastel-red-text)] bg-[var(--pastel-red-bg)] p-2 rounded text-xs border border-[var(--pastel-red-border)]">
							{errorMessage}
						</div>
					{:else}
						<pre class="whitespace-pre-wrap break-all">{secretValue || '(Empty Secret String)'}</pre>
					{/if}
				</div>
			</div>
		</div>

		<div class="pt-3 border-t border-[var(--border)] flex justify-between items-center">
			<Button variant="outline" size="sm" onclick={handleClose} class="text-xs border-[var(--border)]">
				Close
			</Button>

			{#if secret}
				<Button
					variant="default"
					size="sm"
					class="text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437]"
					onclick={() => {
						const s = secret;
						handleClose();
						if (s) onEdit?.(s);
					}}
				>
					<PencilSimple weight="bold" class="size-3.5 mr-1.5" />
					Edit Secret
				</Button>
			{/if}
		</div>
	</SheetContent>
</Sheet>
