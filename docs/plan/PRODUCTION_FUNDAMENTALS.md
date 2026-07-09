# Production Fundamentals

**Status:** In progress  
**Phase:** Engineering Roadmap Phase 1  
**Goal:** The team can see production health, identify failures quickly, and decide what to fix first without building a custom observability platform.

## Scope

Production fundamentals is intentionally split into small implementation parts:

1. [Production Health Checks](./PRODUCTION_HEALTH_CHECKS.md)
2. [Structured Logging](./STRUCTURED_LOGGING.md)
3. [Error Tracing with Sentry](./ERROR_TRACING_SENTRY.md)
4. [Metrics, Dashboards, and Alerts](./METRICS_DASHBOARDS_ALERTS.md)
5. [PostHog Product Analytics](./PRODUCT_ANALYTICS_POSTHOG.md)
6. [Notion Operations Hub](./OPERATIONS_HUB_NOTION.md)

## Platform Direction

Keep the current stack for this phase:

- Cloudflare Workers for the application runtime and domain routing.
- Cloudflare Hyperdrive for Postgres connection pooling.
- Supabase for database, auth, and storage.
- Sentry for application errors and tracing.
- Cloudflare observability for Worker logs, traces, request volume, status codes, and latency.
- PostHog for product analytics after the technical baseline is stable.
- Notion as the single source of truth for operational dashboard links, runbooks, readiness, risks, and roadmap status.

Do not migrate to Railway or Sevalla during Phase 1. Revisit hosting only when a concrete limit appears: background-job requirements, private networking, Worker runtime constraints, database connection pressure, operational visibility gaps, or team workflows that make the current stack expensive to operate.

## Phase 1 Exit Criteria

- `/healthz` confirms the Worker/app is alive without dependency checks.
- `/readyz` checks database readiness through the production database path.
- Operational endpoint responses and logs are structured, redacted, and no-store.
- Sentry remains enabled for frontend and Worker errors with expected-error suppression.
- Cloudflare, Supabase, Sentry, and PostHog dashboards are linked from Notion.
- Critical failure-mode alerts are defined and tested.
- Follow-up work is tracked in Linear or the roadmap before moving to SLOs.
