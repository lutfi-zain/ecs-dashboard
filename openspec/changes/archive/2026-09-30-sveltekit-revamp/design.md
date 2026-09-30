# Design

## Context

The ECS Dashboard is an internal operational tool for managing and monitoring AWS ECS clusters across environments (`kairos-pay`, `kairos-his`, `kairos-pas`, and `fe-cluster-ecs-iac`) in AWS region `ap-southeast-3`. The legacy implementation uses Next.js 14 with React 18, `"use client"` on all pages, client-side only data fetching after mount, and massive monolithic pages (`/` at 1111 lines, `/secrets` at 874 lines, `/metrics` at 556 lines). Furthermore, the application relies on ~50+ Radix UI packages, Recharts, and produces Windows `.bat` scripts for container shell execution despite running primarily in Linux developer environments.

The revamp migrates the entire frontend and API layer to SvelteKit with Svelte 5 (runes) running on Bun with `@sveltejs/adapter-node`. This eliminates Virtual DOM overhead, drops the JavaScript bundle footprint from ~80KB down to ~15KB, introduces SSR via `+page.server.ts` for instantaneous initial paints, and wraps the interface in a refined minimalist editorial design system.

## Goals / Non-Goals

**Goals:**
- Complete framework migration from Next.js 14 / React 18 to SvelteKit / Svelte 5 with zero client-side React runtime overhead.
- Deliver sub-300ms first paint across all primary dashboard views via SvelteKit SSR `load` functions.
- Modularize monolithic views into clean, single-responsibility Svelte components (~60–120 lines each).
- Provide a consistent, minimalist editorial design system using Tailwind CSS, warm stone monochrome palettes (`stone-50` to `stone-950`), custom typography (Newsreader, Geist Sans, Geist Mono), and `mode-watcher` dark mode.
- Maintain full feature parity with existing operations: cluster overview, service listing/filtering, force deployment, CloudWatch CPU/RAM metrics, Secrets Manager CRUD, and ECS exec shell generation (updated for Linux bash).
- Transition charting to LayerCake with SVG renderers for performant, accessible data visualization.

**Non-Goals:**
- Adding authentication or role-based access control (RBAC); remains an internal, local/trusted network utility.
- Implementing push-based real-time telemetry (WebSockets or SSE); on-demand manual polling and interval polling are retained.
- Multi-region AWS infrastructure support (region remains fixed at `ap-southeast-3`).
- Complex cloud CI/CD pipelines or containerization workflows outside local development and Node adapter deployment.

## Decisions

### 1. Project Scaffolding & Runtime
- **Decision**: SvelteKit with Svelte 5 (runes), Bun as package manager and runtime runner, `@sveltejs/adapter-node` for production output, and strict TypeScript.
- **Rationale**: Bun provides fast dependency installation and native TypeScript execution. Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`) offer explicit reactivity without hidden compiler magic. `@sveltejs/adapter-node` provides a lightweight Node server suitable for local hosting.
- **Alternatives Considered**:
  - *Keep Next.js 14 App Router*: Heavy bundle sizes, complex server/client boundary bugs, and high memory footprint for an internal dashboard.
  - *SvelteKit with `@sveltejs/adapter-static`*: Fails to support server-side AWS SDK proxying and Secrets Manager credential security without introducing a separate external API backend.

### 2. Directory Structure & Organization
- **Decision**: Organize the project into distinct domains:
  ```text
  src/
  ├── app.css
  ├── app.d.ts
  ├── app.html
  ├── lib/
  │   ├── components/
  │   │   ├── ui/             # shadcn-svelte primitives (button, card, dialog, table, etc.)
  │   │   ├── layout/         # App shell, sidebar, header, mode toggle
  │   │   ├── cluster/        # Cluster overview cards, status badges
  │   │   ├── service/        # Service table, filtering, deployment action modals
  │   │   ├── metrics/        # LayerCake chart wrappers, axis, tooltip components
  │   │   └── secrets/        # Secret tables, inspector drawer/modal, edit forms
  │   ├── server/
  │   │   ├── aws/            # ECS, CloudWatch, SecretsManager client singletons
  │   │   └── rate-limit/     # Token bucket / throttling utilities for AWS API calls
  │   ├── stores/             # Cross-cutting non-persisted client stores / UI context
  │   └── types/              # Domain TypeScript interfaces (ECS, Secrets, Metrics)
  └── routes/
      ├── +layout.svelte      # App shell wrapper, font loads, mode-watcher provider
      ├── +layout.server.ts   # Global AWS connection / health preflight check
      ├── +page.svelte        # Cluster & Service dashboard
      ├── +page.server.ts     # Cluster & Service SSR load function
      ├── metrics/
      │   ├── +page.svelte
      │   └── +page.server.ts
      ├── secrets/
      │   ├── +page.svelte
      │   └── +page.server.ts
      └── api/
          ├── aws-health/+server.ts
          ├── ecs-services/+server.ts
          ├── ecs-force-update/+server.ts
          ├── ecs-metrics/+server.ts
          ├── ecs-metrics-range/+server.ts
          ├── secrets-manager/+server.ts
          └── secrets-manager/[name]/+server.ts
  ```
- **Rationale**: Isolates reusable UI components from business logic domains and prevents accidental leaking of AWS server-side credentials to client bundles.

### 3. Component Architecture & Decomposition
- **Decision**: Decompose the 1111-line Next.js monolith and large views into atomic, single-responsibility components capped at ~60–120 lines.
- **Component Tree**:
  - `RootLayout (+layout.svelte)`
    - `Sidebar (src/lib/components/layout/Sidebar.svelte)`
    - `Header (src/lib/components/layout/Header.svelte)`
      - `AwsHealthBadge (src/lib/components/layout/AwsHealthBadge.svelte)`
      - `ModeToggle (src/lib/components/layout/ModeToggle.svelte)`
    - `Slot / Page Content`
      - **Dashboard (`/`)**:
        - `ClusterStatsOverview (src/lib/components/cluster/ClusterStatsOverview.svelte)`
          - `ClusterStatCard (src/lib/components/cluster/ClusterStatCard.svelte)`
        - `ClusterFilterTabs (src/lib/components/cluster/ClusterFilterTabs.svelte)`
        - `ServiceTable (src/lib/components/service/ServiceTable.svelte)`
          - `ServiceTableRow (src/lib/components/service/ServiceTableRow.svelte)`
          - `ServiceStatusBadge (src/lib/components/service/ServiceStatusBadge.svelte)`
        - `ForceDeployDialog (src/lib/components/service/ForceDeployDialog.svelte)`
        - `ShellConnectModal (src/lib/components/service/ShellConnectModal.svelte)`
      - **Metrics (`/metrics`)**:
        - `MetricsControls (src/lib/components/metrics/MetricsControls.svelte)`
        - `MetricsBentoGrid (src/lib/components/metrics/MetricsBentoGrid.svelte)`
          - `MetricCard (src/lib/components/metrics/MetricCard.svelte)`
            - `CpuAreaChart (src/lib/components/metrics/CpuAreaChart.svelte)`
            - `MemoryAreaChart (src/lib/components/metrics/MemoryAreaChart.svelte)`
      - **Secrets (`/secrets`)**:
        - `SecretsTable (src/lib/components/secrets/SecretsTable.svelte)`
        - `SecretViewDrawer (src/lib/components/secrets/SecretViewDrawer.svelte)`
        - `SecretCreateDialog (src/lib/components/secrets/SecretCreateDialog.svelte)`
        - `SecretDeleteConfirm (src/lib/components/secrets/SecretDeleteConfirm.svelte)`
- **Rationale**: High cohesion and testability; avoids mega-state containers where single edits cause massive rerenders or regressions.

### 4. State Management with Svelte 5 Runes
- **Decision**: Eliminate external global state libraries (Zustand/Redux). Use Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`) for view and component state, passing data downward via props and emitting user interactions via callbacks.
- **Rationale**: Rune-based reactivity is fine-grained, dependency-tracked at compile time, and eliminates re-render performance bottlenecks. Page-level state sits at the route root and flows to child components.
- **Alternatives Considered**:
  - *Svelte Writable Stores*: Svelte 4 legacy pattern; verbose subscription syntax (`$store`) and less expressive than native runes.
  - *Context API everywhere*: Overcomplicates simple child component parameterization.

### 5. Server Routes & SSR Architecture
- **Decision**: Use `+page.server.ts` `load()` functions for initial SSR rendering of data, paired with `+server.ts` endpoints under `src/routes/api/**` for imperative on-demand client actions (forcing service deployments, fetching granular CloudWatch time windows, mutating secrets).
- **Rationale**: Guarantees zero-blank first paint when navigating directly or refreshing. The user immediately receives the cluster summary and cached service list without waiting for client-side waterfall fetches.
- **Alternatives Considered**:
  - *Client-only data fetching (`onMount`)*: The legacy Next.js pattern resulted in visual flash, layout shifts, and spinners on every page reload.

### 6. Design System Implementation (minimalist-ui)
- **Decision**: Implement a warm monochrome palette centered around Tailwind's `stone` scale (`stone-50` to `stone-950`), custom CSS variables for light/dark theming, flat bento layout grids, and ultra-flat borders (`border-stone-200 dark:border-stone-800`, 1px solid, low opacity).
- **Tokens**:
  - Background: light `bg-stone-50`, dark `bg-stone-950`
  - Surface/Card: light `bg-stone-100/60`, dark `bg-stone-900/60`
  - Text: light `text-stone-900` / `text-stone-600`, dark `text-stone-100` / `text-stone-400`
  - Semantic Status:
    - Normal / Stable: `emerald-600` / `emerald-400`
    - Warning / Transitioning: `amber-600` / `amber-400`
    - Critical / Failed: `rose-600` / `rose-400`
- **Rationale**: Minimalist editorial aesthetic removes cognitive noise, avoids gratuitous drop shadows or saturated gradients, and keeps focus strictly on cluster metrics and service health.

### 7. Typography Strategy
- **Decision**: Combine three targeted typefaces:
  - Editorial Serifs: `Newsreader` via Google Fonts for top-level headers and section markers.
  - Geometric Sans: `@fontsource/geist-sans` for user interface labels, tables, and navigation body text.
  - Technical Mono: `@fontsource/geist-mono` for ARNs, task IDs, secret values, CloudWatch metrics, and code snippets.
- **Rationale**: Self-hosted Geist fonts eliminate external font latency and privacy concerns, while Newsreader adds distinct editorial polish to an operational tool.

### 8. Charting with LayerCake
- **Decision**: Adopt LayerCake with SVG renderers for CPU and Memory CloudWatch telemetry charts, replacing Recharts.
- **Rationale**: LayerCake is built specifically for Svelte. It separates the chart math, scales (D3 scales), and coordinates from the visual rendering elements. SVG renderers allow styling via Tailwind utility classes and CSS variables matching our stone palette without bundle bloat.
- **Alternatives Considered**:
  - *Recharts (React)*: Impossible without embedding React runtime in Svelte.
  - *Chart.js / Canvas*: Harder to theme cleanly with Tailwind dark mode tokens, higher memory overhead for multiple canvas elements, poor responsiveness.

### 9. Migration Strategy: Clean Cutover
- **Decision**: Full greenfield cutover rather than hybrid coexistence or incremental page-by-page routing proxies.
- **Rationale**: The core dashboard consists of only three views and eight API routes. Dual-running Next.js and SvelteKit behind an Nginx reverse proxy adds architectural complexity without benefits for a self-contained local tool.
- **Alternatives Considered**:
  - *Strangler pattern via reverse proxy*: Excessive operational overhead for an internal codebase under 4,000 lines of total code.

### 10. Dark Mode Strategy
- **Decision**: Use `mode-watcher` configured with `attribute="class"` on the document root element, coupled with CSS custom properties in `src/app.css` for semantic color mappings.
- **Rationale**: Prevents flash of unstyled theme (FOUT) during SSR hydration, integrates seamlessly with `shadcn-svelte`, and persists user preference via `localStorage`.

## Risks / Trade-offs

- **AWS SDK Compatibility in Node adapter**:
  - *Risk*: Misconfigured bundling or edge runtimes failing with Node native AWS SDK modules.
  - *Mitigation*: `@sveltejs/adapter-node` runs on standard Node.js / Bun runtime environments. AWS SDK v3 packages (`@aws-sdk/client-ecs`, `@aws-sdk/client-cloudwatch`, `@aws-sdk/client-secrets-manager`) are imported solely inside `src/lib/server/**` and server routes.
- **shadcn-svelte Component Parity**:
  - *Risk*: Missing components or mismatched APIs compared to Radix UI / shadcn/ui React.
  - *Mitigation*: All required components (`Table`, `Card`, `Badge`, `Button`, `Select`, `Checkbox`, `Dialog`, `Alert`, `Skeleton`, `Tabs`, `Tooltip`, `Sheet`) exist in `shadcn-svelte` (based on `bits-ui`).
- **LayerCake Learning Curve & Custom SVG Components**:
  - *Risk*: Unlike Recharts' batteries-included components (`<XAxis />`, `<Tooltip />`), LayerCake requires authoring custom Svelte SVG components for axes and hover crosshairs.
  - *Mitigation*: Build reusable `<AxisX />`, `<AxisY />`, `<Area />`, and `<Tooltip />` helper components once in `src/lib/components/metrics/` with clear D3-scale bindings.
- **Hot-Reload / Dev Experience**:
  - *Risk*: Vite HMR differences or Svelte 5 rune migration friction.
  - *Mitigation*: SvelteKit with Vite offers significantly faster HMR cycles than Webpack/Turbopack on Next.js, and Svelte 5 runes provide clearer stack traces on runtime errors.
