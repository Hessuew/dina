# Notion Operations Hub

**Status:** Planned

## Purpose

Notion is the single source of truth for operational navigation and management metadata. The app should not duplicate vendor dashboards in Phase 1.

## Required Links

The operations hub should link to:

- Cloudflare production health dashboard.
- Cloudflare Worker logs/traces.
- Supabase project dashboard and metrics.
- Sentry project issues, releases, performance, and alerts.
- PostHog product analytics dashboards.
- Runbooks and incident templates.
- Production readiness reviews.
- Risk register entries for production telemetry and restore readiness.

## Maintenance Rule

When repo changes affect SLI/SLOs, dashboards, runbooks, risks, readiness, maturity, or roadmap status, run `bun run docs:notion-check` and update the matching Notion pages at the end of the task.
