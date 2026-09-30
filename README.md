# 🚀 ECS Cluster Management Dashboard (SvelteKit Edition)

A high-performance, real-time operations dashboard for monitoring and managing Amazon Elastic Container Service (ECS) clusters and services, built with **SvelteKit**, **Svelte 5 (runes)**, **Tailwind CSS**, and **LayerCake**.

## ✨ Features

- **⚡ Blazing Fast SSR**: Sub-300ms first paint powered by SvelteKit `+page.server.ts` load functions. Zero React virtual DOM overhead (~15KB compiled JavaScript).
- **🎨 Minimalist Editorial Design**: Warm monochrome stone palette (`stone-50` to `stone-950`), custom typographic hierarchy (Newsreader display serif, Geist Sans, Geist Mono), ultra-flat 1px borders, and zero gratuitous drop shadows or saturated gradients.
- **🌓 Dark Mode**: Seamless dark and light theme switching powered by `mode-watcher` with no flash of unstyled content.
- **📊 Cluster & Service Overview**: High-level cluster health cards with running/pending task counters, active service tables with search, and status filtering.
- **🚀 Rolling Force Deployments**: One-click multi-service force deployments (`forceNewDeployment: true`) with live status feedback.
- **📈 CloudWatch Telemetry**: Interactive CPU and memory time-series charts using **LayerCake** with crosshair tooltips and customizable preset (15m to 7d) or custom time ranges.
- **🔐 Secrets Manager**: AWS Secrets Manager browsing, JSON/plaintext inspection drawer, clipboard copy, and full CRUD creation/editing/deletion.
- **💻 Linux ECS Exec Script Generator**: Instant generation of portable `.sh` container connection scripts with pre-flight CLI verification and `/bin/bash` -> `/bin/sh` fallback.

## 🛠️ Tech Stack

- **Framework**: SvelteKit 2 + Svelte 5 (runes: `$state`, `$derived`, `$props`, `$effect`)
- **Runtime & Package Manager**: Bun
- **Styling**: Tailwind CSS v4 + Tailwind Variants
- **Component Primitives**: shadcn-svelte (bits-ui)
- **Charts**: LayerCake (SVG renderer)
- **Icons**: Lucide Svelte
- **Theming**: mode-watcher
- **AWS Integration**: AWS SDK for JavaScript v3 (ECS, CloudWatch, Secrets Manager)
- **Deployment Adapter**: `@sveltejs/adapter-node`

## 📋 Prerequisites

- **Bun**: v1.1.0 or higher
- **AWS CLI**: configured with credentials or IAM role with permissions:
  - `ecs:DescribeClusters`, `ecs:ListServices`, `ecs:DescribeServices`, `ecs:DescribeTaskDefinition`, `ecs:UpdateService`
  - `cloudwatch:GetMetricStatistics`
  - `secretsmanager:ListSecrets`, `secretsmanager:GetSecretValue`, `secretsmanager:CreateSecret`, `secretsmanager:PutSecretValue`, `secretsmanager:DeleteSecret`

## 🚀 Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure AWS Environment

Default region is `ap-southeast-3`. You can specify a custom region or credentials:

```bash
export AWS_REGION="ap-southeast-3"
# Optional explicit credentials (falls back to AWS CLI credentials chain ~/.aws/credentials)
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
```

### 3. Run Development Server

```bash
bun run dev
```

Dashboard will be live at `http://localhost:5173`.

### 4. Build for Production

```bash
bun run build
bun run preview
```

## 📁 Project Structure

```text
src/
├── app.css                   # Tailwind v4 imports, stone palette custom properties
├── app.d.ts                  # Global type declarations
├── app.html                  # HTML template with Newsreader font preloads
├── lib/
│   ├── components/
│   │   ├── cluster/          # ClusterStatCard, ClusterStatsOverview
│   │   ├── layout/           # Sidebar, Header, AwsHealthBadge, ModeToggle
│   │   ├── metrics/          # LayerCake AxisX, AxisY, AreaLine, ChartTooltip, MetricCard
│   │   ├── secrets/          # SecretsTable, SecretViewDrawer, SecretCreateDialog
│   │   ├── service/          # ServiceTable, ServiceTableRow, ForceDeployDialog, ShellConnectModal
│   │   └── ui/               # shadcn-svelte components (button, card, dialog, table, etc.)
│   ├── server/
│   │   └── aws/              # AWS client singletons, ECS fetchers, rate limiting
│   ├── types/                # Domain TypeScript models (ECS, Metrics, Secrets)
│   └── utils.ts              # cn helper (clsx + tailwind-merge)
└── routes/
    ├── +layout.svelte        # App shell wrapper with sidebar, header, mode-watcher
    ├── +layout.server.ts     # Global AWS health preflight check
    ├── +page.svelte          # Main cluster dashboard page
    ├── +page.server.ts       # SSR load function for clusters
    ├── metrics/              # Telemetry explorer route
    ├── secrets/              # Secrets Manager route
    └── api/                  # SvelteKit +server.ts endpoints
        ├── aws-health/
        ├── ecs-status/
        ├── ecs-services/
        ├── ecs-force-update/
        ├── ecs-metrics/
        ├── ecs-metrics-range/
        └── secrets-manager/
```

## 🔒 Monitored Clusters

By default, the dashboard monitors these Kairos ECS clusters:
- `kairos-pay-cluster-ecs-iac`
- `kairos-his-cluster-ecs-iac`
- `kairos-pas-cluster-ecs-iac`
- `kairos-fe-cluster-ecs-iac`

## 📄 License

MIT License.
