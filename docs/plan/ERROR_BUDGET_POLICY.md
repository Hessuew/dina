# Error-Budget Policy

**Status:** Draft pending production telemetry
**Phase:** Engineering Roadmap Phase 2 — Reliability
**Owner:** Engineering

This policy defines how DINA uses the existing SLI/SLO draft rows to balance
feature delivery with reliability work. It becomes operational only after
Better Stack/Cloudflare telemetry is visible for the relevant production
signals and the SLO rows move from `Needs data` to an evidence-backed status.

## Covered objectives

| Objective                   | Window  | Target                                                               | Initial budget                                                                                  |
| --------------------------- | ------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Web app availability        | 28 days | 99.9% successful requests, excluding expected 4xx responses          | 0.1% unsuccessful requests; about 40 minutes 19 seconds is the equivalent 28-day time reference |
| Application error rate      | 28 days | Less than 0.5% of user-impacting requests ending in unhandled errors | 0.5% of eligible requests                                                                       |
| Database restore confidence | 30 days | At least one successful isolated-target restore validation           | One validation cycle; a validation older than 30 days is a breach                               |

The availability and application-error budgets are measured from the same
production request population used by the corresponding SLI definitions. Do
not count expected validation, authentication, authorization, or other normal
user-input failures as availability or application-error failures unless the
rate itself is evidence of a service problem.

## Activation gate

Before enforcing this policy, the service owner must confirm all of the
following in the Notion SLI/SLO catalog and linked provider surfaces:

1. Better Stack Errors receives a controlled browser and Worker error with
   environment and release identity.
2. Cloudflare or Better Stack provides request count, status-code rate, and
   latency data for production.
3. Better Stack Uptime monitors both `/healthz` and `/readyz`.
4. A monthly isolated-target Supabase restore drill has dated evidence.
5. Every critical alert has a service owner, runbook, dashboard, and first
   action.

Until then, record measurements and gaps, but do not block releases based on
an unverified budget.

## Operating response

Review budget consumption at least weekly once the policy is active and after
every SEV0/SEV1 incident:

| Budget state                                | Response                                                                                                                                                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Below 50% consumed                          | Normal delivery. Keep alerts and evidence current.                                                                                                                                                                    |
| 50–75% consumed                             | Open or update reliability follow-up work; review the next risky release with the service owner.                                                                                                                      |
| 75–100% consumed                            | Prioritize reliability work, require an explicit rollback plan for risky changes, and avoid optional operational complexity.                                                                                          |
| 100% consumed or restore validation overdue | Treat as a reliability breach. Pause non-essential risky changes, stabilize the service, create or update an incident record when user impact exists, and agree on recovery evidence before resuming normal delivery. |

Security fixes, data-protection work, incident mitigation, and changes needed
to restore service may proceed during a budget breach. Record the reason and
the rollback or validation evidence in the linked Notion incident or follow-up
item.

## Measurement and alerting contract

- Use rolling 28-day windows for availability and application errors.
- Use the restore runbook's monthly cadence for database restore confidence.
- Alert on both a rolling-budget breach and a fast abnormal spike; a single
  alert must not be treated as proof of an SLO breach without checking the
  request population and expected-error exclusions.
- Start investigation with the Better Stack/Cloudflare dashboard, release,
  environment, route or action, request ID, and stable error category.
- Link every alert to [`docs/observability-runbook.md`](../observability-runbook.md)
  and preserve only redacted evidence.

## Review and change control

The service owner reviews targets, exclusions, and alert thresholds quarterly
and after a material product, hosting, or data-recovery change. Changes must
update this document, the matching Notion SLI/SLO rows, and the Engineering
Roadmap note. Do not silently change an SLO target in a dashboard rule.

The current policy is intentionally conservative: it defines the response
contract now while leaving enforcement disabled until provider ingestion and
restore evidence exist.
