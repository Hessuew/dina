# Metrics, Dashboards, And Alerts

**Status:** Repository adapters implemented; provider credentials and alert routing remain fail-closed until verified

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
- Release-correlated error rate above 5% for five minutes.
- Release-correlated p95 latency above 1 second for five minutes.
- New high-severity issue correlated with the release.

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

## Per-version rollout metrics contract

`.github/workflows/production-release.yml` can perform standard or gradual
promotion only when `CLOUDFLARE_VERSION_METRICS_QUERYABLE=true`,
`CLOUDFLARE_VERSION_HIGH_SEVERITY_QUERYABLE=true`, and the protected metrics
adapter is configured. The adapter receives `version_id`, `since`, and `until`
query parameters and returns JSON with these numeric fields:

```json
{
  "requests": 20,
  "errors": 0,
  "p95LatencyMs": 420,
  "highSeverityIssues": 0,
  "since": "2026-09-30T12:00:00.000Z",
  "until": "2026-09-30T12:05:00.000Z"
}
```

The repository validates that response and its exact query window before each
gradual stage and after standard 100% promotion. It fails closed on missing, stale, or
malformed metrics, rolls back on any guardrail breach, and never
uses aggregate Worker traffic as a substitute for per-version evidence. A
low-traffic 10% stage with fewer than 20 new-version requests is promoted
directly to 100% after the guardrails pass. Cloudflare version metadata and
Logpush/observability configuration remain the provider-side source for
correlating the version id and tag.

The Worker records request count, unexpected errors, latency, and release
identity in the `dina_release_metrics` Workers Analytics Engine dataset. It
does not classify ordinary HTTP 5xx responses as high-severity issues. The
protected `/_internal/release/metrics` endpoint therefore remains non-queryable
and returns 503 until a trusted provider adapter supplies the explicit
release-correlated `highSeverityIssues` aggregate. The readiness variables stay
false until that provider signal is configured and verified. The endpoint
requires a release-version match plus a bearer token and is excluded from its
own dataset.

After promotion, `bun run scripts/release-evidence.ts` queries the protected
`PRODUCTION_RELEASE_EVIDENCE_URL` adapter. It must confirm the exact release
tag, validated SHA, Cloudflare version, production origin, source-map
correlation, and successful delivery to Slack `#incidents` and the documented
email fallback. The production workflow fails closed when this evidence is
missing or does not match the promoted release.

The Worker-backed `/_internal/release/evidence` adapter verifies the deployed
version metadata, the injected target SHA/origin, and the Better Stack release
registration. The workflow injects source-map verification and alert-routing
flags only after the corresponding build/provider checks; those flags remain
false until Slack `#incidents` and the documented email fallback are tested.

## Metrics

Phase 1 technical metrics:

- Request count and status code rate.
- Error rate.
- p95 latency.
- Worker execution failures.
- Database readiness and query health.
- External dependency failures when integrations are called.
