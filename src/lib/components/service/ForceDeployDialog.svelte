<script lang="ts">
	import type { UpdateResult } from '$lib/types/ecs.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { PaperPlaneRight, CircleNotch, CheckCircle, WarningCircle } from 'phosphor-svelte';

	interface Props {
		open?: boolean;
		clusterName: string;
		serviceNames: string[];
		deploying?: boolean;
		results?: UpdateResult[] | null;
		onConfirm?: () => void;
		onClose?: () => void;
	}

	let {
		open = $bindable(false),
		clusterName,
		serviceNames,
		deploying = false,
		results = null,
		onConfirm,
		onClose
	}: Props = $props();

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

<Dialog bind:open onOpenChange={(val) => !val && handleClose()}>
	<DialogContent class="max-w-md bg-[var(--card)] border-[var(--border)]">
		<DialogHeader>
			<DialogTitle class="font-serif text-lg font-semibold flex items-center gap-2 text-foreground">
				<PaperPlaneRight weight="bold" class="size-4" />
				Force New Deployment
			</DialogTitle>
			<DialogDescription class="text-xs text-muted-foreground font-sans">
				Trigger rolling deployment on Amazon ECS (<code class="font-mono">forceNewDeployment: true</code>) for the selected services.
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-3 py-2">
			<div class="text-xs font-mono text-muted-foreground">
				Cluster: <span class="text-foreground font-semibold">{clusterName}</span>
			</div>

			<!-- Services List or Results -->
			<div class="max-h-56 overflow-y-auto rounded border border-[var(--border)] bg-[var(--background)] p-2.5 space-y-1.5 font-mono text-xs">
				{#if results && results.length > 0}
					{#each results as res}
						<div class="flex items-start gap-2 p-1.5 rounded {res.success ? 'text-[var(--pastel-green-text)] bg-[var(--pastel-green-bg)]' : 'text-[var(--pastel-red-text)] bg-[var(--pastel-red-bg)]'}">
							{#if res.success}
								<CheckCircle weight="bold" class="size-4 shrink-0 mt-0.5" />
							{:else}
								<WarningCircle weight="bold" class="size-4 shrink-0 mt-0.5" />
							{/if}
							<div class="flex-1">
								<div class="font-semibold">{res.serviceName}</div>
								<div class="text-[10px] opacity-80">{res.message}</div>
							</div>
						</div>
					{/each}
				{:else}
					{#each serviceNames as serviceName}
						<div class="flex items-center justify-between p-1 text-foreground">
							<span class="truncate">{serviceName}</span>
							{#if deploying}
								<CircleNotch weight="bold" class="size-3.5 animate-spin text-muted-foreground" />
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<DialogFooter class="flex justify-end gap-2">
			{#if results}
				<Button variant="default" size="sm" onclick={handleClose} class="text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437]">
					Done
				</Button>
			{:else}
				<Button variant="outline" size="sm" onclick={handleClose} disabled={deploying} class="text-xs border-[var(--border)]">
					Cancel
				</Button>
				<Button
					variant="default"
					size="sm"
					onclick={onConfirm}
					disabled={deploying}
					class="text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437] font-medium"
				>
					{#if deploying}
						<CircleNotch weight="bold" class="size-3.5 mr-1.5 animate-spin" />
						Deploying...
					{:else}
						Confirm Deployment [{serviceNames.length}]
					{/if}
				</Button>
			{/if}
		</DialogFooter>
	</DialogContent>
</Dialog>
