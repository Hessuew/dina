# Metrics, Dashboards, And Alerts

**Status:** Planned after health baseline

## Dashboard Links

Use Notion as the operations hub linking to:

- Cloudflare Worker metrics, logs, traces, deployments, and domain health.
- Supabase database/storage/auth dashboards and metrics.
- Sentry issues, releases, performance, and alerts.
- PostHog product analytics after adoption tracking is implemented.

Do not build a custom in-app dashboard for Phase 1.

## Critical Alerts

Start with a small actionable alert set:

- App unavailable or sustained Worker 5xx responses.
- `/readyz` failure in production.
- Sentry new high-severity issue or error-rate spike.
- Auth failure spike beyond expected user mistakes.
- Database connection/query degradation.
- Deploy regression shortly after release.

Every alert must have an owner, a linked runbook, a dashboard link, and a known first action.

## Metrics

Phase 1 technical metrics:

- Request count and status code rate.
- Error rate.
- p95 latency.
- Worker execution failures.
- Database readiness and query health.
- External dependency failures when integrations are called.
