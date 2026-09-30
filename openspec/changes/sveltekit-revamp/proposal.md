# Proposal

## Why

The current ECS Dashboard is a Next.js 14 React application with a 1111-line monolithic page component, client-side-only rendering, and ~80KB React hydration overhead. All data fetching happens after mount, resulting in slow first paint. The project carries 50+ unused Radix UI dependencies and Windows-only shell generation despite running on Linux. A full framework migration to SvelteKit with Svelte 5 eliminates the virtual DOM, reduces compiled output to ~15KB, and enables server-side initial loads for sub-300ms first paint — while establishing a maintainable component architecture with a premium minimalist design system.

## What Changes

- **BREAKING**: Replace Next.js 14 + React 18 with SvelteKit + Svelte 5 (runes). All existing React components, hooks, and JSX are removed.
- **BREAKING**: Replace shadcn/ui (React) with shadcn-svelte (bits-ui). All component imports change.
- **BREAKING**: Replace recharts with LayerCake for CPU/RAM charts. Chart component API changes entirely.
- Replace Next.js API routes (`app/api/**/route.ts`) with SvelteKit server routes (`src/routes/api/**/+server.ts`). Same HTTP interface, different file convention.
- Replace `next-themes` with `mode-watcher` for dark/light mode toggling.
- Replace `lucide-react` with `lucide-svelte` for icons.
- Add `+page.server.ts` load functions for SSR initial data on all pages.
- Decompose monolithic `page.tsx` (1111 lines) into focused Svelte components (~60-120 lines each).
- Replace Windows `.bat` shell generation with Linux `.sh` script generation.
- Apply minimalist warm monochrome design system: stone palette, editorial typography (Geist Sans/Newsreader/Geist Mono), flat bento grid layout, semantic status colors.
- Add dark mode support with CSS custom properties and `mode-watcher`.
- Add collapsible sidebar navigation replacing inline anchor links.
- Deploy locally with SvelteKit node adapter.

## Capabilities

### New Capabilities

- `design-system`: Warm monochrome design tokens, typography scale, color palette, and component styling conventions for light/dark modes.
- `app-shell`: Sidebar navigation layout, header with AWS health status, and page routing structure.
- `cluster-dashboard`: ECS cluster overview cards, service table with selection/filtering, force deployment actions, and on-demand service metrics.
- `metrics-explorer`: Time-range CPU/RAM line charts per service with cluster and service selection.
- `secrets-manager`: AWS Secrets Manager CRUD interface — list, view, create, edit, delete secrets.
- `shell-connect`: Linux shell script generation for ECS exec container access.
- `aws-integration`: Server-side AWS SDK client factories, rate limiting, retry with backoff, and health check endpoint.

### Modified Capabilities

None (greenfield specs — no prior specs exist).

## Scope

### In Scope
- Full framework migration: Next.js to SvelteKit
- All 5 use cases preserved: cluster dashboard, force deploy, metrics charts, secrets manager, shell connect
- Dark mode support
- Minimalist editorial design system
- SSR initial page loads
- Local deployment (node adapter)

### Out of Scope
- Authentication / authorization
- Real-time WebSocket/SSE updates (manual refresh retained)
- Multi-region support
- CI/CD pipeline
- Test suite migration
