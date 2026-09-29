# Safe Delivery and Migration Operations

**Status:** Implemented — repository workflow is fail-closed pending external production readiness
**Phase:** Engineering Roadmap Phase 3: Safe delivery  
**Owner:** Engineering

### Verification — 2026-09-29

The pull-request quality gate and serialized main release gate remain the only
code-validation gates. The production workflow now promotes an exact validated
main SHA under a new immutable UTC tag; it does not use a long-lived
`production` branch. Automatic promotion is deliberately disabled until the
external readiness checklist is verified. The repository workflow, policy unit
tests, and Wrangler configuration are locally verifiable; no production
mutation is claimed by this document.

## Goal

Ship application and database changes through a repeatable path that keeps the
development and production Supabase environments aligned, preserves a fast
application rollback, and avoids treating a database rollback as an automatic
operation.

This document is the repository-owned procedure. GitHub environment values,
Cloudflare deployment credentials, Supabase project settings, and Better Stack
account URLs remain external configuration and must never be committed.

## Existing delivery controls

- Pull requests to `main` run the changed-file static checks, Cloudflare type
  generation, full TypeScript checking, and the unit suite through
  `.github/workflows/quality-gate.yml`.
- A push to `main` runs the serialized `Main release gate`, which adds the
  integration suite, production build, and `wrangler deploy --dry-run`. If
  `drizzle/**` changed, a dependent job migrates and seeds the hosted
  `development` branch. The workflow can also be dispatched manually with
  `run_development_migration=true` to retry that dependent job after a
  reviewed main release without creating a no-op migration.
- `.github/workflows/production-release.yml` is triggered by a successful
  `Main release gate` on `main`, or manually with a full `target_sha` and
  `standard`/`gradual` profile. It creates a never-reused tag such as
  `v2026.09.29.1`, obtains the protected `production` environment approval,
  replays and applies production migrations without seeding, then uploads an
  undeployed Worker version.
- The release workflow smoke-tests the uploaded version through
  `Cloudflare-Workers-Version-Overrides`, runs the affected public journey
  check, and promotes with Wrangler. Failed health or rollout guardrails
  automatically deploy the recorded previous version at 100% and re-run health
  smoke. The workflow never down-migrates Supabase.
- After promotion, a protected release-evidence adapter must confirm the
  release tag/SHA/Worker version, source-map correlation, and alert delivery to
  Slack `#incidents` plus the documented email fallback. Missing or incomplete
  evidence fails closed and triggers the same Worker rollback path.
- Tagged builds inject the release tag into browser/Worker observability and
  use the Sentry-compatible Vite source-map upload configuration. The workflow
  publishes a GitHub Release containing the previous release, merged PRs,
  commits, migration files, Cloudflare version, rollout result, and rollback
  target.
- The Worker issues the non-sensitive `dina-version-key` cookie on the first
  response. The `christ-dina.org` zone must have a Request Header Transform
  Rule matching `http.cookie contains "dina-version-key"` and dynamically
  setting `Cloudflare-Workers-Version-Key` to
  `http.request.cookies["dina-version-key"][0]`.
- `bun run deploy` remains a local/manual full deployment command. The
  production workflow uses `wrangler versions upload` plus explicit
  `wrangler versions deploy` so upload and serving stay separate.
- The repository integration harness replays the committed Drizzle migration
  journal against PGlite. It is the fast migration-chain check, not proof that
  a hosted restore or provider migration has succeeded.
- `bun run quality:gate` and the main release gate run
  `bun run db:check-safety` for changed `drizzle/*.sql` files. The check keeps
  additive expand work, data backfills, and destructive contract work in
  separate migrations, rejects direct non-null column additions, and requires
  `-- safe-delivery: contract` on a contract migration. It is a review guard,
  not a replacement for the integration migration replay.
- The credential-free health smoke command checks both public operational
  endpoints after a deployment:
  `bun run smoke:health -- https://<deployment-origin>`.
  It requires HTTP 200, a healthy `christ-dina` payload, and database readiness
  on `/readyz`; use `SMOKE_BASE_URL` instead of the positional URL in CI or a
  deployment shell. It never logs the base URL or sends credentials.
- `.github/workflows/post-deploy-smoke.yml` exposes the same check as a
  credential-free GitHub Actions workflow. Run it manually from Actions with
  the deployment origin, or call it from a deployment workflow with
  `workflow_call` after Cloudflare reports the deployment ready. The origin is
  passed as an environment variable rather than interpolated into a shell
  command.

## Required promotion order

## Main and immutable release workflow

`main` is the only long-lived code branch. A production release is identified by
both the exact validated commit SHA and its immutable tag:

```text
successful Main release gate → production environment approval
  → compatible Supabase migration → tagged build/source maps
  → undeployed Worker version → exact-version smoke
  → standard 100% or gradual 10% → 25% → 50% → 100%
  → health/alert/evidence checks → GitHub Release
```

The workflow records the active Cloudflare version before upload as the rollback
target. Failed tags remain in Git history for audit and the next tag sequence
never reuses them. Manual dispatch is allowed only for a full SHA that has a
successful `Main release gate` run and is reachable from `origin/main`.

Gradual promotion is fail-closed unless the configured per-version metrics
adapter returns request count, error count, p95 latency, and new
release-correlated high-severity issue count. Each stage waits at least ten
minutes and requires at least 20 new-version requests. If the 10% stage is
below that floor, the workflow promotes directly to 100% after guardrails pass.

### Application-only change

1. Open a pull request and wait for the pull-request quality gate.
2. Merge to `main` and wait for the serialized main release gate.
3. Allow the automatic standard promotion, or manually dispatch the production
   workflow for the same validated SHA.
4. Confirm the tagged version override smoke and affected journey smoke pass.
5. Watch Better Stack Errors, Logs & Traces, Uptime, and Cloudflare for the
   first release window. Record the release and environment when investigating
   a regression.

### Change that includes a migration

1. Design the schema change as backward-compatible expand/contract work before
   generating SQL.
2. Generate a new migration with `bun run db:generate`; never edit an applied
   migration or use `bun run db:push` against a hosted branch.
3. Run `bun run test:integration` and the normal pull-request quality gate.
   The gate must pass the changed-migration safety check as well as the
   application checks.
4. Merge to `main` and wait for the main release gate plus the dependent
   development migration and synthetic seed to finish successfully.
5. Exercise the changed application against the hosted `development` branch.
   Verify the migration, affected authenticated read/write path, and any
   Storage/Auth behavior using synthetic data only.
6. Promote that exact SHA through `.github/workflows/production-release.yml`.
   The protected `production` environment gates the migration; production is
   never seeded and no second SQL variant is created.
7. Deploy the Worker only after the compatible production schema is ready,
   unless the expand/contract plan explicitly requires an earlier compatible
   application version.
8. Confirm the GitHub Release, tag/SHA, migration evidence, Cloudflare version,
   health payload/header, source maps, alert checks, and rollback target before
   closing the rollout.

If a migration changes a critical table, attach the relevant backup/restore
evidence or an approved restore rehearsal reference to the release record. Do
not put connection strings, dumps, row values, or provider secrets in that
record.

## Expand/contract rules

Use the following sequence for schema changes that affect a live application:

1. **Expand:** add nullable columns, new tables, compatible indexes, or
   additive enum values. Keep the old application behavior valid.
2. **Migrate application:** deploy code that can read the old and new shape,
   and dual-write only when the transition requires it. Gate risky behavior
   behind a feature flag when a real gradual rollout is needed.
3. **Backfill:** run a bounded, observable backfill outside the request path.
   Validate counts and failures without recording sensitive row values.
4. **Enforce:** add not-null or uniqueness constraints only after existing data
   satisfies them and the deployed application writes the new shape.
5. **Contract:** remove obsolete columns, indexes, or compatibility code in a
   later migration after the rollback window has ended. Mark that migration
   with `-- safe-delivery: contract` so CI requires the separate review.

Avoid combining destructive changes, long-running backfills, and unrelated
application behavior in one migration. A migration must be safe to retry using
Drizzle's migration history and must preserve the constraints relied on by
application idempotency.

## Rollback decision tree

| Failure                                         | First action                                                                                      | Database action                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cloudflare application regression               | Redeploy the last known-good Worker version and run smoke checks                                  | None if the schema is backward-compatible                                                               |
| Health or rollout guardrail failure             | Let the release workflow deploy its recorded previous Worker version and re-run smoke             | None                                                                                                    |
| Better Stack/source-map or telemetry regression | Keep Cloudflare retention enabled, restore the previous DSN/configuration if needed, and redeploy | None                                                                                                    |
| Migration rejected before applying              | Stop the promotion and inspect the provider migration error                                       | Correct the migration in a new commit; do not edit the failed file until its hosted state is understood |
| Migration applied and code is incompatible      | Roll forward with a compatibility fix or use an already-tested compatible application version     | Do not guess a down migration                                                                           |
| Data corruption or destructive schema mistake   | Declare an incident and stop risky deploys/migrations                                             | Use the isolated restore/incident procedure in `docs/database-backup-restore-runbook.md`                |

Drizzle does not provide an automatic rollback. A rollback of application code
is not a rollback of database state. Prefer a forward-fix migration for an
applied additive change. Use restore only when the incident owner approves the
data-loss, downtime, and Storage/Auth implications.

## Release evidence checklist

Before marking a migration release complete, record pass/fail references for:

- pull-request quality gate and main release gate;
- the immutable release tag and exact SHA promoted to both environments;
- hosted development migration and synthetic seed;
- development smoke checks for `/healthz`, `/readyz`, and the affected path;
- production migration workflow and production smoke checks;
- Better Stack release/environment/source-map verification;
- Cloudflare version, version-override smoke, rollout result, and rollback target;
- alert delivery to Slack `#incidents` plus the documented email fallback;
- release-evidence confirmation for the exact tag, SHA, Worker version, and
  source-map correlation;
- follow-up owner/date for any deferred contract cleanup.

Keep the evidence in the team's normal launch or operations record. Never paste
raw logs, credentials, full SQL exports, user data, or private provider error
messages into repository or Notion documentation.

## Manual controls still required

The following are intentionally not automated by this repository and must be
completed in the external systems before Phase 3 is considered operational:

- protect `main` with pull request, quality-gate, and no-force-push rules;
- configure the `production` environment with a five-minute wait timer and sole
  contributor self-approval;
- create least-privilege `CLOUDFLARE_API_TOKEN` and
  `CLOUDFLARE_ACCOUNT_ID` credentials and retain runtime secrets in Cloudflare;
- configure Cloudflare version URLs, the `dina-version-key` version-affinity
  transform rule, custom domain, and Hyperdrive binding;
- configure Better Stack and Cloudflare alerts to Slack `#incidents` plus the
  documented email fallback;
- configure the protected release-evidence adapter consumed by
  `bun run scripts/release-evidence.ts`;
- activate `/healthz` and `/readyz` monitors and verify source-map correlation;
- query Cloudflare per-version rollout metrics or keep gradual dispatch
  manual/fail-closed;
- rehearse Worker rollback and isolated Supabase restore; and
- link the current release, dashboard, and runbook URLs from Notion.

## Related procedures

- [`docs/SUPABASE_ENVIRONMENTS.md`](../SUPABASE_ENVIRONMENTS.md) — branch
  separation and hosted environment configuration.
- [`drizzle/README.md`](../../drizzle/README.md) — migration authoring and
  promotion quick reference.
- [`docs/database-backup-restore-runbook.md`](../database-backup-restore-runbook.md)
  — isolated restore drill and incident restore path.
- [`docs/observability-runbook.md`](../observability-runbook.md) — post-deploy
  smoke checks, rollback, and incident response.
