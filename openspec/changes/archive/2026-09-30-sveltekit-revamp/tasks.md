# Tasks

## 1. Project Scaffolding & Configuration

- [x] 1.1 Initialize SvelteKit project with `bun create svelte@latest` using Svelte 5, TypeScript (strict), and `@sveltejs/adapter-node`
- [x] 1.2 Configure `svelte.config.js` with node adapter, path aliases (`$lib`), and TypeScript settings
- [x] 1.3 Install and configure Tailwind CSS with `stone` palette extended in `tailwind.config.ts`; set up `src/app.css` with CSS custom properties for light/dark semantic tokens (background, foreground, card, muted, border, status colors)
- [x] 1.4 Initialize shadcn-svelte: run `bunx shadcn-svelte@latest init`, configure `components.json` for `$lib/components/ui` alias
- [x] 1.5 Install typography packages: `@fontsource/geist-sans`, `@fontsource/geist-mono`, add Google Fonts Newsreader via `<link>` in `src/app.html`
- [x] 1.6 Install `mode-watcher` and configure with `attribute="class"` in root layout
- [x] 1.7 Install `lucide-svelte` for icons
- [x] 1.8 Install `layercake` for charting
- [x] 1.9 Migrate AWS SDK dependencies: `@aws-sdk/client-ecs`, `@aws-sdk/client-cloudwatch`, `@aws-sdk/client-secrets-manager`, `@aws-sdk/credential-providers`
- [x] 1.10 Create `src/app.html` with font preloads, lang attribute, and theme-flash-prevention script
- [x] 1.11 Create `src/app.d.ts` with SvelteKit type declarations and `PageData` interfaces for each route

## 2. Design System & Tokens

- [x] 2.1 Define CSS custom properties in `src/app.css`: `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--accent` for both `:root` (light) and `.dark` scopes using stone palette values
- [x] 2.2 Define semantic status token variables: `--status-healthy` (emerald), `--status-warning` (amber), `--status-critical` (rose) — consistent across light/dark
- [x] 2.3 Configure Tailwind `theme.extend` with `fontFamily` entries: `sans` (Geist Sans), `serif` (Newsreader), `mono` (Geist Mono); set tight tracking on display headings (`-0.02em` to `-0.04em`)
- [x] 2.4 Add shadcn-svelte components: `button`, `card`, `badge`, `table`, `select`, `checkbox`, `dialog`, `alert`, `skeleton`, `tabs`, `tooltip`, `sheet`, `separator`, `alert-dialog`, `input`, `textarea`, `label`, `scroll-area`

## 3. Shared Types & Server Utilities

- [x] 3.1 Create `src/lib/types/ecs.ts`: `ClusterData`, `ServiceStatus`, `ServiceMetrics`, `UpdateResult`, `AWSHealthStatus` interfaces (port from current `app/page.tsx` types)
- [x] 3.2 Create `src/lib/types/secrets.ts`: `Secret` interface (port from current `app/secrets-manager/page.tsx`)
- [x] 3.3 Create `src/lib/types/metrics.ts`: `MetricDataPoint`, `MetricsData`, `Service` interfaces (port from current `app/metrics/page.tsx`)
- [x] 3.4 Create `src/lib/server/aws/clients.ts`: `getAWSConfig()`, `createECSClient()`, `createCloudWatchClient()`, `createSecretsManagerClient()`, `testAWSConnection()` — port from `lib/aws-config.ts` with identical credential chain logic
- [x] 3.5 Create `src/lib/server/aws/rate-limit.ts`: `RateLimiter` class (max 3 concurrent, 200ms delay) and `retryWithBackoff()` (3 retries, 1000ms base, jitter) — port from `app/api/ecs-status/route.ts`
- [x] 3.6 Create `src/lib/utils.ts`: `cn()` helper (clsx + tailwind-merge)

## 4. App Shell & Layout

- [x] 4.1 Create `src/lib/components/layout/Sidebar.svelte`: collapsible sidebar with nav items (Dashboard, Metrics, Secrets), active route indication via `$page.url.pathname`, collapse toggle, dark/light mode toggle at bottom
- [x] 4.2 Create `src/lib/components/layout/Header.svelte`: page title (reactive to route), AWS health badge, last-updated timestamp, refresh button, health check button
- [x] 4.3 Create `src/lib/components/layout/AwsHealthBadge.svelte`: status badge showing AWS connection state (healthy/error) with region, uses emerald/rose status tokens
- [x] 4.4 Create `src/lib/components/layout/ModeToggle.svelte`: dark/light/system toggle using `mode-watcher`'s `toggleMode` and `setMode`
- [x] 4.5 Create `src/routes/+layout.svelte`: app shell wrapper — imports fonts, wraps content in sidebar + header structure, provides `mode-watcher` `ModeWatcher` component
- [x] 4.6 Create `src/routes/+layout.server.ts`: global load function that runs `testAWSConnection()` and returns health status to all pages

## 5. API Server Routes

- [x] 5.1 Create `src/routes/api/aws-health/+server.ts`: GET handler — port from `app/api/aws-health/route.ts`, calls `testAWSConnection()`
- [x] 5.2 Create `src/routes/api/ecs-status/+server.ts`: GET handler — port cluster + service listing with task definition enrichment, rate limiting, and retry logic from `app/api/ecs-status/route.ts` (341 lines)
- [x] 5.3 Create `src/routes/api/ecs-services/+server.ts`: GET handler — port service listing for a specific cluster from `app/api/ecs-services/route.ts`
- [x] 5.4 Create `src/routes/api/ecs-force-update/+server.ts`: POST handler — port force deployment logic with cluster whitelist validation from `app/api/ecs-force-update/route.ts`
- [x] 5.5 Create `src/routes/api/ecs-metrics/+server.ts`: POST handler — port on-demand CPU/RAM metric fetch from `app/api/ecs-metrics/route.ts`
- [x] 5.6 Create `src/routes/api/ecs-metrics-range/+server.ts`: POST handler — port time-range metric query with 7-day validation from `app/api/ecs-metrics-range/route.ts`
- [x] 5.7 Create `src/routes/api/secrets-manager/+server.ts`: GET (list) + POST (create) handlers — port from `app/api/secrets-manager/route.ts`
- [x] 5.8 Create `src/routes/api/secrets-manager/[name]/+server.ts`: GET (view) + PUT (update) + DELETE handlers — port from `app/api/secrets-manager/[name]/route.ts`

## 6. Cluster Dashboard Page

- [x] 6.1 Create `src/routes/+page.server.ts`: SSR load function that fetches all cluster data from AWS ECS (reuse rate-limited fetcher from server utils), returns typed `ClusterData[]` and health status
- [x] 6.2 Create `src/lib/components/cluster/ClusterStatCard.svelte`: single cluster card showing name, status badge, active services count, running/pending task counts; click selects cluster; selected state with accent border
- [x] 6.3 Create `src/lib/components/cluster/ClusterStatsOverview.svelte`: horizontal card grid of `ClusterStatCard` for all clusters, with cluster dropdown selector
- [x] 6.4 Create `src/lib/components/service/ServiceStatusBadge.svelte`: status badge with icon (CheckCircle/Clock/AlertCircle) and semantic status color tokens
- [x] 6.5 Create `src/lib/components/service/ServiceTableRow.svelte`: single table row with checkbox, service name (mono font), status badge, tasks (running/desired/pending), CPU% (color-coded), RAM% (color-coded), task definition, last deployment date, created date, actions (metrics load button, shell connect button)
- [x] 6.6 Create `src/lib/components/service/ServiceTable.svelte`: full table wrapping `ServiceTableRow` components, select-all checkbox, status filter dropdown, empty state handling
- [x] 6.7 Create `src/lib/components/service/ForceDeployDialog.svelte`: confirmation dialog listing selected services, execute button, per-service result status display (success/failure badges)
- [x] 6.8 Create `src/lib/components/service/ShellConnectModal.svelte`: generates and downloads Linux `.sh` script for ECS exec — includes AWS CLI checks, task ARN discovery, container detection, /bin/bash → /bin/sh fallback
- [x] 6.9 Create `src/routes/+page.svelte`: dashboard page composing ClusterStatsOverview + ServiceTable + ForceDeployDialog + ShellConnectModal, with page-level `$state` for selectedCluster, selectedServices, statusFilter, loading, error, metricsData; client-side refresh via fetch to `/api/ecs-status`

## 7. Metrics Explorer Page

- [x] 7.1 Create `src/routes/metrics/+page.server.ts`: SSR load function that returns available cluster names and optionally pre-fetches service list for default cluster
- [x] 7.2 Create `src/lib/components/metrics/AxisX.svelte`: reusable LayerCake SVG X-axis component with time-formatted tick labels
- [x] 7.3 Create `src/lib/components/metrics/AxisY.svelte`: reusable LayerCake SVG Y-axis component with percentage-formatted tick labels
- [x] 7.4 Create `src/lib/components/metrics/AreaLine.svelte`: reusable LayerCake SVG area + line path component with gradient fill using stone/status tokens
- [x] 7.5 Create `src/lib/components/metrics/ChartTooltip.svelte`: hover tooltip showing timestamp, CPU%, and Memory% values at cursor position
- [x] 7.6 Create `src/lib/components/metrics/MetricCard.svelte`: single chart card wrapping LayerCake with `AxisX`, `AxisY`, `AreaLine`, `ChartTooltip`; accepts metric data array, title, and color
- [x] 7.7 Create `src/lib/components/metrics/MetricsControls.svelte`: cluster dropdown, service dropdown (fetched on cluster change), time range selector (preset + custom datetime inputs), metric type toggle (CPU/Memory/Both)
- [x] 7.8 Create `src/lib/components/metrics/MetricsBentoGrid.svelte`: bento grid layout rendering one or two `MetricCard` components based on metric type selection
- [x] 7.9 Create `src/routes/metrics/+page.svelte`: metrics page composing MetricsControls + MetricsBentoGrid, with page-level state for selections and fetched data; client-side fetch to `/api/ecs-metrics-range`

## 8. Secrets Manager Page

- [x] 8.1 Create `src/routes/secrets/+page.server.ts`: SSR load function that fetches secret list from AWS Secrets Manager
- [x] 8.2 Create `src/lib/components/secrets/SecretsTable.svelte`: table of secrets with columns: name, description, last changed, last accessed; row actions (view, edit, delete); refresh button; loading skeletons
- [x] 8.3 Create `src/lib/components/secrets/SecretViewDrawer.svelte`: sheet/drawer displaying secret value (JSON formatted with mono font), copy-to-clipboard button with visual feedback
- [x] 8.4 Create `src/lib/components/secrets/SecretCreateDialog.svelte`: dialog form with name input, value textarea (supports JSON), optional description; validates required fields; POST to `/api/secrets-manager`
- [x] 8.5 Create `src/lib/components/secrets/SecretDeleteConfirm.svelte`: alert-dialog with confirmation message, cancel/delete actions; DELETE to `/api/secrets-manager/[name]`
- [x] 8.6 Create `src/routes/secrets/+page.svelte`: secrets page composing SecretsTable + SecretViewDrawer + SecretCreateDialog + SecretDeleteConfirm, with page-level state for selected secret, modal visibility, operation loading

## 9. Motion & Polish

- [x] 9.1 Create `src/lib/components/ui/ScrollReveal.svelte`: wrapper component using IntersectionObserver for scroll-entry animations (translateY(12px) + opacity over 600ms with cubic-bezier(0.16, 1, 0.3, 1)); respects `prefers-reduced-motion`
- [x] 9.2 Apply staggered reveal animations to cluster cards and table rows using CSS `animation-delay: calc(var(--index) * 80ms)`
- [x] 9.3 Add hover state transitions to cards: ultra-subtle shadow shift (`0 2px 8px rgba(0,0,0,0.04)`) over 200ms; button active state `scale(0.98)`
- [x] 9.4 Ensure all motion uses only `transform` and `opacity` properties — no layout-triggering animations

## 10. Integration & Verification

- [x] 10.1 Remove all Next.js files: `app/`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts` (old), `components/`, `hooks/`, `lib/` (old), `styles/`, `public/` placeholders that are unused
- [x] 10.2 Update `package.json`: change scripts to SvelteKit (`dev`, `build`, `preview`), remove all React/Next.js/Radix dependencies, update project metadata
- [x] 10.3 Run `bun run build` with node adapter — verify clean build with no TypeScript errors
- [x] 10.4 Run `bun run preview` — verify all 3 pages render with SSR data, dark/light mode toggle works, sidebar navigation functions
- [x] 10.5 Verify cluster dashboard: cluster cards display, service table loads, force deploy dialog works, shell script downloads as `.sh`
- [x] 10.6 Verify metrics page: cluster/service selection works, time range presets and custom range produce charts, LayerCake tooltips function
- [x] 10.7 Verify secrets page: list loads, view drawer shows formatted JSON, create/edit/delete operations complete successfully
- [x] 10.8 Update `README.md`: reflect SvelteKit stack, bun commands, new project structure, remove Next.js references
