# Observability Runbook

**Status:** Draft pending external dashboard and escalation setup  
**Scope:** DINA web application, Cloudflare Worker, Supabase database/auth/storage, Better Stack, and PostHog

Use this runbook when a production alert fires or a user-impacting failure is
reported. The operations hub is the admin-only `/admin/observability` route and
the Notion **Operations and Runbooks** page. Provider URLs are configured in
the deployment environment; do not add credentials or account-specific URLs to
this document.

## Operating rules

- Treat Better Stack as the application error, logs/traces, uptime, and alerting
  surface. Use Cloudflare for Worker request volume, status codes, latency, and
  retained logs while the migration is being validated.
- Use request IDs, release identifiers, route/action names, and stable error
  categories to correlate events. Never copy passwords, tokens, cookies,
  connection strings, service-role keys, email/phone values, raw request or
  submission content, private mentorship content, or raw provider errors into
  an incident record.
- `/healthz` checks Worker/application liveness without dependencies.
  `/readyz` checks the production database path and can fail while the Worker
  is still serving requests.
- Every incident has one incident commander, one technical owner, a severity,
  a current impact statement, and a next update time. The first responder may
  assign these roles to themselves until the service owner is reached.
- Prefer reversible mitigation and preserve evidence. Do not delete the old
  Sentry project, disable Cloudflare log persistence, or change production
  database credentials during initial triage.

## Severity and escalation

Use the severity values in the Notion Incident Database:

| Severity | Use when                                                                                | Escalation expectation                                                              |
| -------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `SEV0`   | Widespread outage, confirmed data loss, or an active security emergency                 | Page the platform/service owner immediately; maintain continuous updates            |
| `SEV1`   | Major user-facing outage or severe degradation without a practical workaround           | Engage the platform/service owner now; update at least every 30 minutes             |
| `SEV2`   | Limited workflow failure, elevated error rate, or degraded dependency with a workaround | Assign an owner during business hours; update when the impact or mitigation changes |
| `SEV3`   | Isolated, low-impact, or non-urgent operational issue                                   | Record and queue follow-up; no emergency response required                          |

Role-based escalation is intentional because named on-call contacts and Slack
destinations are account-specific. Resolve the current service owner from the
Notion Service Catalog, then use the team’s configured email/Slack escalation
target. If no owner or escalation target is configured, the incident commander
is responsible for escalating to the technical decision-maker and recording
that gap as follow-up work.

## First five minutes

1. Acknowledge the alert or user report and record the detection time.
2. Open `/admin/observability` or the Notion Operations and Runbooks hub. Use
   the linked Better Stack, Cloudflare, Supabase, and deployment surfaces.
3. Check the latest deployment/release and the affected environment. Compare
   the first failure time with the deployment time.
4. Run read-only health checks when the public endpoint is reachable:
   ```sh
   curl -i https://christ-dina.org/healthz
   curl -i https://christ-dina.org/readyz
   ```
5. Create or update an incident in the Notion Incident Database. Do not
   overwrite the `Template - production incident review` row. Set severity,
   status, service, impact, started time, and owner; add the Better Stack or
   Cloudflare incident URL when one exists.
6. Post a short acknowledgement in the team’s incident channel if Slack is
   configured: what is affected, who owns response, current mitigation, and
   the next update time.

If the signal is an expected validation, invalid OTP, authorization denial, or
other normal user-input outcome, do not declare an infrastructure incident
without evidence of an abnormal rate or user impact.

## Alert response matrix

### Worker or site unavailable

- **Symptoms:** Better Stack Uptime reports `/healthz` failure, the site is not
  reachable, or Cloudflare reports Worker execution failures.
- **Impact:** Most or all users cannot load the application.
- **Detection:** Better Stack Uptime health monitor and Cloudflare Worker
  status/error metrics.
- **First checks:** Check the Uptime incident, DNS/route status, Cloudflare
  deployment history, latest release, and whether `/healthz` fails from more
  than one network location.
- **Immediate mitigation:** If a recent deployment correlates with the outage,
  roll back to the last known-good Worker deployment in Cloudflare. If no
  deployment correlates, keep the Worker serving path intact and escalate to
  the platform/service owner.
- **Root cause:** Compare the release, Worker exception group, status-code
  spike, and deployment configuration. Preserve request IDs and timestamps.
- **Recovery:** Confirm `/healthz` returns HTTP 2xx, the Uptime incident closes,
  and the error rate returns to baseline before resolving the incident.

### Database readiness failure

- **Symptoms:** `/readyz` returns HTTP 503 or its Better Stack Uptime monitor
  fails while `/healthz` remains healthy.
- **Impact:** Database-backed reads and writes may fail or time out.
- **Detection:** Better Stack Uptime readiness monitor, `readiness_check`
  events, and Cloudflare/Better Stack database error categories.
- **First checks:** Check Supabase status and database metrics, Hyperdrive
  binding/deployment configuration, recent migrations, and the readiness event’s
  duration/error category. Never expose or paste the connection string.
- **Immediate mitigation:** Pause risky deploys and migration activity. If the
  failure follows a release, roll back the application release without deleting
  or manually reversing data. Escalate provider degradation to the service
  owner.
- **Root cause:** Determine whether the cause is provider availability,
  connectivity/binding configuration, a migration, or query/connection
  pressure. Record the stable category and release instead of raw errors.
- **Recovery:** Confirm repeated `/readyz` HTTP 2xx responses, successful
  representative reads/writes, and no continuing readiness alerts.
- For suspected data loss or corruption, follow the separate
  [database backup and restore validation runbook](./database-backup-restore-runbook.md);
  do not improvise a same-project restore during readiness triage.

### Sustained 5xx or new high-severity application error

- **Symptoms:** Error rate exceeds the initial 5% for 5 minutes, Better Stack
  Errors opens a high-impact issue, or Cloudflare status-code metrics spike.
- **Impact:** One or more workflows fail for users.
- **Detection:** Better Stack Errors issue/error-rate alert and Cloudflare
  status-code telemetry.
- **First checks:** Open the issue group, environment, release, route/action,
  request IDs, and error category. Separate expected 4xx/user-input outcomes
  from unexpected server failures.
- **Immediate mitigation:** If the first occurrence follows a release, stop
  rollout and roll back the Worker. If the issue is isolated, disable the
  affected rollout only when an approved feature flag exists; do not invent a
  flag during an incident.
- **Root cause:** Compare symbolicated source maps, the release diff, database
  readiness, external dependency status, and affected workflow.
- **Recovery:** Replay a safe read-only check or a controlled test path, confirm
  the error group stops growing, and document any affected records or retries.

### Latency regression

- **Symptoms:** p95 request latency exceeds 1 second for 5 minutes, requests
  time out, or users report slow pages/actions.
- **Impact:** The application is degraded even if requests eventually succeed.
- **Detection:** Cloudflare latency metrics and Better Stack Telemetry
  dashboard/alert.
- **First checks:** Compare p50/p95/p99 by route, Worker execution time,
  database query duration/readiness, release, and external calls. Check whether
  the issue is regional or global.
- **Immediate mitigation:** Roll back a correlated release. Avoid increasing
  retries or timeouts until the dependency and request volume are understood.
- **Root cause:** Identify the slow route/query/dependency and capture a
  follow-up performance task with the relevant dashboard and release links.
- **Recovery:** Confirm latency returns below the alert threshold over a full
  observation window and no backlog or retry storm remains.

### Authentication or authorization failure spike

- **Symptoms:** Login, signup, OTP, session refresh, or protected actions fail
  above normal levels; users report access errors.
- **Impact:** Users cannot sign in or access permitted workflows; an
  authorization bug may expose restricted data.
- **Detection:** Better Stack application errors, Supabase Auth status/metrics,
  and reports from affected users.
- **First checks:** Separate invalid credentials/expired OTPs/expected denials
  from provider or server failures. Check release, Supabase status, request
  path, and safe error category. For suspected authorization leakage, treat it
  as at least `SEV1` and restrict access while investigating.
- **Immediate mitigation:** Roll back a correlated release. For a suspected
  access-control bug, stop the affected route or deployment and preserve audit
  events; do not export user data into the incident channel.
- **Root cause:** Review auth boundary, server-side authorization, row filters,
  and recent policy/configuration changes. Use stable user/actor IDs only when
  access is authorized and necessary.
- **Recovery:** Verify login, session refresh, and one representative protected
  read path for each affected role; for authorization incidents, complete a
  security review before closing.

### Storage, email, messaging, notification, or external dependency failure

- **Symptoms:** Uploads, signed URLs, invitation/reset emails, WhatsApp sends,
  or notification fan-out fail or accumulate failures.
- **Impact:** The affected workflow is degraded; core application availability
  may remain healthy.
- **Detection:** Structured failure events, Better Stack issue groups, provider
  status pages, and user reports.
- **First checks:** Identify the integration, action path, release, stable
  failure category, and safe count of affected operations. Check provider quota,
  credentials/configuration presence, and whether failures are transient.
- **Immediate mitigation:** Pause a failing batch or repeated retry source;
  preserve best-effort semantics for notifications. Do not log or paste provider
  exception text, recipient details, tokens, or private storage paths.
- **Root cause:** Compare provider health, configuration/deployment changes,
  object permissions, template/quota state, and persistence outcomes.
- **Recovery:** Verify one controlled operation, confirm retries are bounded,
  and reconcile any records that need reprocessing.

### PostHog analytics or Better Stack ingestion failure

- **Symptoms:** Product events, application errors, or Worker telemetry are not
  visible in the expected provider surface.
- **Impact:** Observability or product measurement is degraded; the app should
  continue serving users unless the provider failure is masking a separate
  application failure.
- **Detection:** Provider Live tail/project event checks and the cutover
  acceptance checklist in `GNHF-10.9.206.md`.
- **First checks:** Check environment-specific key/host/DSN/destination values,
  release/environment identity, provider source status, and Cloudflare
  `persist: true`. Use a controlled test event/error, never real user content.
- **Immediate mitigation:** Keep Cloudflare retention enabled and use Cloudflare
  logs/metrics plus the existing Sentry-compatible transport as the fallback
  during transition. Do not add a second browser error SDK.
- **Root cause:** Check provider ingestion status, endpoint/region, source
  token, deployment secret wiring, and source-map upload configuration without
  exposing their values.
- **Recovery:** Confirm test telemetry in the intended environment, then update
  the Notion dashboard row and close the integration follow-up. Keep the old
  Sentry project read-only until the Better Stack acceptance checklist passes.

## Incident workflow and closure

1. **Declare:** Choose severity, name the incident commander and technical
   owner, state the user impact, and start a Notion incident row.
2. **Stabilize:** Stop rollout, roll back a correlated release, isolate a
   failing batch, or preserve the healthy fallback. Record each action and its
   result.
3. **Communicate:** Put concise updates in the configured incident channel and
   Notion incident row. Include timestamps, impact, mitigation, and next update
   time; omit sensitive payloads.
4. **Investigate:** Correlate Better Stack issue groups, Cloudflare telemetry,
   Uptime incidents, Supabase status, deployment history, request IDs, and
   stable event categories.
5. **Recover:** Verify the affected health/workflow checks and observe the
   system long enough to catch recurrence. Reopen the incident if the symptom
   returns.
6. **Close:** Set the Notion incident status to `Mitigated`, `Reviewed`, or
   `Closed` as appropriate. Record root cause only after evidence is available,
   link the dashboard/runbook, and create follow-up Linear work for permanent
   fixes.
7. **Review:** For `SEV0`/`SEV1`, complete a blameless review with timeline,
   contributing factors, detection quality, what worked, and action owners.

## Dashboard and link sources

Use these places to obtain the current links; never hardcode a private account
URL in this runbook:

- `/admin/observability` for configured public links in the current deployment.
- Notion **Operations and Runbooks** for the canonical dashboard, runbook,
  incident, and readiness links.
- Better Stack Errors for application issues, releases, source maps, and error
  alerts; Better Stack Telemetry for logs/traces/dashboards; Better Stack
  Uptime for `/healthz` and `/readyz` monitors.
- Cloudflare Workers & Pages → the `christ-dina` Worker → Observability for
  request metrics, logs, traces, deployments, and destinations.
- Supabase project → database, auth, and storage status/metrics.
- GitHub Actions and deployment history for release timing and rollback context.

The external setup sequence, source tokens, dashboard construction, alert
thresholds, and rollback of the Better Stack cutover are maintained in
[`GNHF-10.9.206.md`](../GNHF-10.9.206.md). The Notion incident database is the
tracker of record; create a separate Google Doc only if the team explicitly
chooses it and then link it from Notion and the incident channel.

## Owner and review

- **Operational owner:** the current platform/service owner in the Notion
  Service Catalog.
- **Incident owner:** the assigned incident commander until handoff is
  explicitly recorded.
- **Review cadence:** after every `SEV0`/`SEV1`, after a material alerting or
  provider change, and at least once per quarter while this runbook is active.
- **Known gap:** external Better Stack/Cloudflare destinations, alert routes,
  Slack channel, and named escalation contacts are still account setup work.
