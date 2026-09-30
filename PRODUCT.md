# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

SvelteKit 2, Svelte 5 (runes), Tailwind CSS v4, shadcn-svelte (bits-ui), LayerCake, Phosphor Icons, Bun

## Users

DevOps engineers, SREs, and backend developers responsible for managing microservices running on Amazon ECS across Siloam/Kairos clusters (`kairos-pay-cluster-ecs-iac`, `kairos-his-cluster-ecs-iac`, `kairos-pas-cluster-ecs-iac`, `kairos-fe-cluster-ecs-iac`) in region `ap-southeast-3`.

## Product Purpose

A dedicated, ultra-responsive operational dashboard that provides real-time cluster health monitoring, service status inspection, one-click rolling force deployments, CloudWatch resource telemetry, AWS Secrets Manager management, and one-click ECS Exec container shell scripts.

## Positioning

An ultra-lean, local-first internal command center for Amazon ECS with zero hydration overhead (sub-300ms SSR), combining brutalist data density with editorial typographic clarity. It avoids cloud console sluggishness and complex multi-step AWS CLI incantations.

## Operating Context

- Used in desktop browser environments during daily service deployments, monitoring, incident triage, and configuration debugging.
- Direct interaction with AWS ECS, CloudWatch, and Secrets Manager APIs in `ap-southeast-3`.
- Strict read/write boundaries with rate limiting and exponential backoff to avoid AWS API throttling.

## Capabilities and Constraints

- High-level cluster capacity and health inspection (Active services, Running tasks, Pending tasks).
- Service table with real-time text search, status filters, and multi-service selection.
- Rolling force deployment trigger (`forceNewDeployment: true`) with per-service status confirmation.
- CloudWatch CPU and Memory utilization time-series charts powered by LayerCake.
- AWS Secrets Manager key-value browsing, JSON syntax inspection, and full CRUD creation/editing/deletion.
- Instant Linux `.sh` container connection script generation with pre-flight CLI verification and `/bin/bash` -> `/bin/sh` fallback.
- Strictly local node adapter deployment without public internet authentication.

## Brand Commitments

- Aesthetic: Premium Utilitarian Minimalism & Editorial UI (`minimalist-ui` protocol).
- High-contrast warm monochrome palette (`#F7F6F3` canvas, `#FFFFFF` cards, `#EAEAEA` borders, `#111111` off-black text).
- Muted spot pastels (Pale Green, Pale Yellow, Pale Red, Pale Blue).
- Editorial typographic hierarchy: Newsreader serif display headers, Geist Sans body, Geist Mono metadata.
- Phosphor Icons (Bold & Fill weights).

## Evidence on Hand

- Existing ECS status endpoints, CloudWatch metrics APIs, and Secrets Manager API routes.
- Pre-configured Kairos cluster whitelists and AWS credentials chain.

## Product Principles

1. **Velocity and Directness**: No ceremonial friction; critical metrics, status badges, and deployment controls are visible and actionable within one click.
2. **Utilitarian Elegance**: Extreme typographic contrast, macro-whitespace, and clean 1px borders replace decorative gradients and heavy drop shadows.
3. **Information Density without Chaos**: Clear bento box layouts, semantic muted pastel badges, and monospace alignment provide immediate cognitive parsing.
4. **Resilient Feedback**: Immediate visual acknowledgment for every asynchronous AWS mutation (deployments, metric queries, secret edits).
