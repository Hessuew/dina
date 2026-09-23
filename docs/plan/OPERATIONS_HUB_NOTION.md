# Notion Operations Hub

**Status:** In progress — core production links are identified; external provider wiring and ownership metadata pending

## Purpose

Notion is the single source of truth for operational navigation and management metadata. The app should not duplicate vendor dashboards in Phase 1.

## Required Links

The operations hub should link to:

- Cloudflare production health dashboard.
- Cloudflare Worker logs/traces.
- Supabase project dashboard and metrics.
- Better Stack Errors issues, releases, performance, and alerts.
- Better Stack Logs & Traces dashboards and Uptime monitors.
- PostHog product analytics dashboards.
- Runbooks and incident templates.
- Production readiness reviews.
- Risk register entries for production telemetry and restore readiness.

## Maintenance Rule

When repo changes affect SLI/SLOs, dashboards, runbooks, risks, readiness, maturity, or roadmap status, run `bun run docs:notion-check` and update the matching Notion pages at the end of the task.

## Closeout evidence — 2026-09-23

The Notion operations hub can now link to the live Cloudflare Worker
observability view and the Better Stack `/healthz` monitor. Better Stack
Errors has a `DINA production` application with verified controlled browser
ingestion; its DSN is configured in the local ignored environment, GitHub
Actions secret store, and encrypted Worker secret. The Telemetry source is
still the onboarding/demo source. Keep alert routes, named ownership, PostHog,
source-map verification, and restore validation as explicit follow-up metadata
rather than marking the hub operationally complete.
