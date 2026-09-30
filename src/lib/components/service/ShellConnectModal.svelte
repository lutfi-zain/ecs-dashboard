<script lang="ts">
	import type { ServiceStatus } from '$lib/types/ecs.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { TerminalWindow, DownloadSimple, Copy, Check } from 'phosphor-svelte';

	interface Props {
		open?: boolean;
		service: ServiceStatus | null;
		clusterName: string;
		onClose?: () => void;
	}

	let { open = $bindable(false), service, clusterName, onClose }: Props = $props();

	let copied = $state(false);
	const region = 'ap-southeast-3';

	function generateShellScript(): string {
		if (!service) return '';

		const serviceName = service.serviceName;

		return `#!/usr/bin/env bash
# ==============================================================================
# AWS ECS Exec Container Terminal Connection
# Service: ${serviceName}
# Cluster: ${clusterName}
# Region:  ${region}
# ==============================================================================

set -euo pipefail

CLUSTER="${clusterName}"
SERVICE="${serviceName}"
REGION="${region}"

echo "Connecting to ECS Service: $SERVICE..."

if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI v2 is not installed or not in PATH."
    exit 1
fi

if ! aws sts get-caller-identity --region "$REGION" &> /dev/null; then
    echo "ERROR: AWS credentials not configured or expired."
    exit 1
fi

TASK_ARN=$(aws ecs list-tasks \\
    --cluster "$CLUSTER" \\
    --service-name "$SERVICE" \\
    --region "$REGION" \\
    --desired-status RUNNING \\
    --query "taskArns[0]" \\
    --output text 2>/dev/null || true)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "None" ]; then
    echo "ERROR: No RUNNING tasks found for service $SERVICE."
    exit 1
fi

CONTAINER_NAME=$(aws ecs describe-tasks \\
    --cluster "$CLUSTER" \\
    --tasks "$TASK_ARN" \\
    --region "$REGION" \\
    --query "tasks[0].containers[0].name" \\
    --output text 2>/dev/null || true)

echo "Starting session into container $CONTAINER_NAME..."

if ! aws ecs execute-command \\
    --cluster "$CLUSTER" \\
    --task "$TASK_ARN" \\
    --container "$CONTAINER_NAME" \\
    --interactive \\
    --command "/bin/bash" \\
    --region "$REGION"; then
    echo "Notice: /bin/bash not available, trying /bin/sh..."
    aws ecs execute-command \\
        --cluster "$CLUSTER" \\
        --task "$TASK_ARN" \\
        --container "$CONTAINER_NAME" \\
        --interactive \\
        --command "/bin/sh" \\
        --region "$REGION"
fi
`;
	}

	function handleDownloadScript() {
		if (!service) return;
		const script = generateShellScript();
		const blob = new Blob([script], { type: 'application/x-sh' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `ecs-connect-${service.serviceName}.sh`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	async function handleCopyScript() {
		const script = generateShellScript();
		await navigator.clipboard.writeText(script);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function handleClose() {
		open = false;
		onClose?.();
	}
</script>

<Dialog bind:open onOpenChange={(val) => !val && handleClose()}>
	<DialogContent class="max-w-xl bg-[var(--card)] border-[var(--border)]">
		<DialogHeader>
			<DialogTitle class="font-serif text-lg font-semibold flex items-center gap-2 text-foreground">
				<TerminalWindow weight="bold" class="size-4 text-stone-700 dark:text-stone-300" />
				ECS Exec Terminal Connection
			</DialogTitle>
			<DialogDescription class="text-xs text-muted-foreground font-sans">
				Portable Linux shell script for interactive terminal access into <code class="font-mono">{service?.serviceName}</code>.
			</DialogDescription>
		</DialogHeader>

		<div class="space-y-3 py-2 text-xs">
			<div class="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
				<span>Cluster: <strong class="text-foreground">{clusterName}</strong></span>
				<span>Region: <strong class="text-foreground">{region}</strong></span>
			</div>

			<!-- Faux-OS Window Chrome wrapper -->
			<div class="rounded border border-[var(--border)] bg-[var(--card)] overflow-hidden">
				<!-- Window Header Bar with 3 circles -->
				<div class="h-6 px-3 bg-[var(--muted)]/60 border-b border-[var(--border)] flex items-center justify-between">
					<div class="flex items-center gap-1.5">
						<div class="size-2 rounded-full bg-stone-300 dark:bg-stone-700"></div>
						<div class="size-2 rounded-full bg-stone-300 dark:bg-stone-700"></div>
						<div class="size-2 rounded-full bg-stone-300 dark:bg-stone-700"></div>
					</div>
					<span class="text-[10px] font-mono text-muted-foreground">ecs-connect-{service?.serviceName}.sh</span>
					<div class="w-8"></div>
				</div>

				<!-- Code Content -->
				<div class="relative bg-[var(--background)]">
					<pre class="max-h-52 overflow-y-auto p-3 font-mono text-[11px] text-foreground leading-relaxed">
{generateShellScript()}
					</pre>
					<Button
						variant="ghost"
						size="sm"
						class="absolute top-2 right-2 h-6 px-2 text-[10px] font-mono bg-[var(--card)] border border-[var(--border)]"
						onclick={handleCopyScript}
						title="Copy script to clipboard"
					>
						{#if copied}
							<Check weight="bold" class="size-3 mr-1 text-[var(--pastel-green-text)]" />
							<span>Copied</span>
						{:else}
							<Copy weight="bold" class="size-3 mr-1" />
							<span>Copy</span>
						{/if}
					</Button>
				</div>
			</div>

			<!-- Keystroke Micro-UI Execution Instructions -->
			<div class="bg-[var(--muted)]/40 p-3 rounded border border-[var(--border)] text-[11px] text-muted-foreground space-y-1.5 font-sans">
				<p class="font-medium text-foreground">Execution Instructions:</p>
				<div class="space-y-1 font-mono text-[11px]">
					<div>1. <kbd>chmod +x ecs-connect-{service?.serviceName}.sh</kbd></div>
					<div>2. <kbd>./ecs-connect-{service?.serviceName}.sh</kbd></div>
					<div class="text-[10px] text-muted-foreground font-sans mt-1">Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to disconnect when finished.</div>
				</div>
			</div>
		</div>

		<DialogFooter class="flex justify-between items-center">
			<Button variant="outline" size="sm" onclick={handleClose} class="text-xs border-[var(--border)]">
				Close
			</Button>

			<Button
				variant="default"
				size="sm"
				onclick={handleDownloadScript}
				class="text-xs bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#2F3437] font-medium"
			>
				<DownloadSimple weight="bold" class="size-3.5 mr-1.5" />
				Download Script (.sh)
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
