<script lang="ts">
	import type { Secret } from '$lib/types/secrets.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Key,
		Eye,
		PencilSimple,
		Trash,
		Plus,
		ArrowClockwise,
		MagnifyingGlass,
		LockKey
	} from 'phosphor-svelte';

	interface Props {
		secrets: Secret[];
		loading?: boolean;
		onViewSecret: (secret: Secret) => void;
		onEditSecret: (secret: Secret) => void;
		onDeleteSecret: (secret: Secret) => void;
		onCreateSecret: () => void;
		onRefresh: () => void;
	}

	let {
		secrets,
		loading = false,
		onViewSecret,
		onEditSecret,
		onDeleteSecret,
		onCreateSecret,
		onRefresh
	}: Props = $props();

	let searchQuery = $state('');

	let filteredSecrets = $derived.by(() => {
		if (!searchQuery) return secrets;
		const query = searchQuery.toLowerCase();
		return secrets.filter(
			(s) =>
				s.name.toLowerCase().includes(query) ||
				(s.description && s.description.toLowerCase().includes(query))
		);
	});
</script>

<div class="space-y-3">
	<!-- Control Bar: Search and Create Action -->
	<div class="flex items-center justify-between gap-3 bg-[var(--card)] p-3 rounded bento-card">
		<div class="relative flex-1 max-w-sm">
			<MagnifyingGlass weight="bold" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
			<Input
				placeholder="Search secret names or descriptions..."
				bind:value={searchQuery}
				class="pl-8 h-8 text-xs bg-[var(--background)] font-mono border-[var(--border)]"
			/>
		</div>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				class="h-8 px-2.5 text-xs text-foreground border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)]"
				onclick={onRefresh}
				disabled={loading}
				title="Refresh secrets list"
			>
				<ArrowClockwise weight="bold" class="size-3.5 mr-1.5 {loading ? 'animate-spin' : ''}" />
				<span>Refresh</span>
			</Button>

			<Button
				variant="default"
				size="sm"
				class="h-8 px-3 text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437] font-medium"
				onclick={onCreateSecret}
			>
				<Plus weight="bold" class="size-3.5 mr-1.5" />
				<span>Create Secret</span>
			</Button>
		</div>
	</div>

	<!-- Table Area -->
	<div class="rounded bento-card overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-xs border-collapse">
				<thead>
					<tr class="border-b border-[var(--border)] bg-[var(--muted)]/50 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
						<th class="px-4 py-2.5">Secret Name</th>
						<th class="px-4 py-2.5">Description</th>
						<th class="px-4 py-2.5">Last Changed</th>
						<th class="px-4 py-2.5">Last Accessed</th>
						<th class="px-4 py-2.5 text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						{#each Array(5) as _}
							<tr class="border-b border-[var(--border)]/60 animate-pulse">
								<td class="px-4 py-3"><div class="h-4 w-40 bg-[var(--muted)] rounded"></div></td>
								<td class="px-4 py-3"><div class="h-4 w-56 bg-[var(--muted)] rounded"></div></td>
								<td class="px-4 py-3"><div class="h-4 w-24 bg-[var(--muted)] rounded"></div></td>
								<td class="px-4 py-3"><div class="h-4 w-24 bg-[var(--muted)] rounded"></div></td>
								<td class="px-4 py-3 text-right"><div class="h-6 w-20 bg-[var(--muted)] rounded ml-auto"></div></td>
							</tr>
						{/each}
					{:else if filteredSecrets.length === 0}
						<tr>
							<td colspan="5" class="py-12 text-center text-muted-foreground">
								<div class="flex flex-col items-center justify-center gap-2">
									<LockKey weight="bold" class="size-8 text-stone-400 opacity-60" />
									<p class="font-serif text-sm text-foreground font-medium">No secrets found</p>
									<p class="text-xs">
										{searchQuery
											? 'No secrets matched your search query.'
											: 'No secrets exist in AWS Secrets Manager for this region.'}
									</p>
								</div>
							</td>
						</tr>
					{:else}
						{#each filteredSecrets as secret (secret.arn)}
							<tr class="border-b border-[var(--border)] hover:bg-[var(--muted)]/40 transition-colors">
								<!-- Secret Name -->
								<td class="px-4 py-3 font-mono font-semibold text-xs text-foreground max-w-xs truncate" title={secret.name}>
									<div class="flex items-center gap-2">
										<Key weight="bold" class="size-3.5 text-stone-500 shrink-0" />
										<span class="truncate">{secret.name}</span>
									</div>
								</td>

								<!-- Description -->
								<td class="px-4 py-3 text-muted-foreground max-w-sm truncate" title={secret.description || ''}>
									{secret.description || '—'}
								</td>

								<!-- Last Changed -->
								<td class="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
									{secret.lastChangedDate ? new Date(secret.lastChangedDate).toLocaleDateString() : '—'}
								</td>

								<!-- Last Accessed -->
								<td class="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
									{secret.lastAccessedDate ? new Date(secret.lastAccessedDate).toLocaleDateString() : '—'}
								</td>

								<!-- Action Buttons -->
								<td class="px-4 py-3 whitespace-nowrap text-right">
									<div class="flex items-center justify-end gap-1">
										<Button
											variant="ghost"
											size="sm"
											class="size-7 p-0 text-muted-foreground hover:text-foreground"
											onclick={() => onViewSecret(secret)}
											title="View secret value"
										>
											<Eye weight="bold" class="size-3.5" />
										</Button>

										<Button
											variant="ghost"
											size="sm"
											class="size-7 p-0 text-muted-foreground hover:text-foreground"
											onclick={() => onEditSecret(secret)}
											title="Edit secret value"
										>
											<PencilSimple weight="bold" class="size-3.5" />
										</Button>

										<Button
											variant="ghost"
											size="sm"
											class="size-7 p-0 text-[var(--pastel-red-text)] hover:bg-[var(--pastel-red-bg)]"
											onclick={() => onDeleteSecret(secret)}
											title="Delete secret"
										>
											<Trash weight="bold" class="size-3.5" />
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
