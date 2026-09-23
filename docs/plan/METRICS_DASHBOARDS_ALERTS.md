# Metrics, Dashboards, And Alerts

**Status:** Cloudflare and health baseline verified; external dashboards and alert routing pending

## Dashboard Links

Use Notion as the operations hub linking to:

- Cloudflare Worker metrics, logs, traces, deployments, and domain health.
- Supabase database/storage/auth dashboards and metrics.
- Better Stack Errors issues, releases, performance, and alerts.
- Better Stack Logs & Traces dashboards and log-derived metrics.
- Better Stack Uptime health monitors and incidents.
- PostHog product analytics after adoption tracking is implemented.

Do not build a custom in-app dashboard for Phase 1.

## Critical Alerts

Start with a small actionable alert set:

- App unavailable or sustained Worker 5xx responses.
- `/readyz` failure in production.
- Better Stack new high-severity issue or error-rate spike.
- Auth failure spike beyond expected user mistakes.
- Database connection/query degradation.
- Deploy regression shortly after release.

Response procedures for these alerts are documented in
[`docs/observability-runbook.md`](../observability-runbook.md). Keep each
external alert linked to the matching runbook entry once the Better Stack and
Cloudflare alert rules are created.

Every alert must have an owner, a linked runbook, a dashboard link, and a known first action.

## Verification — 2026-09-23

- Cloudflare Worker observability is enabled and queryable in production; the
  live view showed 146 successful events and 0 errors in the last hour, with
  request logs and trace links available.
- Better Stack Uptime monitor `christ-dina.org/healthz` is up, checked every
  three minutes, and has zero incidents.
- Better Stack Errors has a `DINA production` application and accepted a
  controlled browser exception from the local production-style build. No
  Better Stack or Cloudflare alert rules have been created, Slack has not been
  connected, and no paging test alert was sent.
- Keep the SLI/SLO rows in `Needs data` until a dashboard link, alert rule, and
  enough production history exist to evaluate the target rather than only a
  point-in-time smoke check.

## Metrics

Phase 1 technical metrics:

- Request count and status code rate.
- Error rate.
- p95 latency.
- Worker execution failures.
- Database readiness and query health.
- External dependency failures when integrations are called.
