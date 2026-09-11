# Safe Delivery and Migration Operations

**Status:** In progress — repository procedure implemented; hosted rehearsal pending  
**Phase:** Engineering Roadmap Phase 3: Safe delivery  
**Owner:** Engineering

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
  integration suite and production build. If `drizzle/**` changed, a dependent
  job migrates and seeds the hosted `development` branch.
- A push to the protected `production` branch that includes `drizzle/**` runs
  `.github/workflows/migrate-production.yml`. It validates the migration chain,
  requires the latest green main release gate, and applies pending migrations
  without seeding production.
- The application deployment command is `bun run deploy` (`vite build` then
  `wrangler deploy`). Run it only with the intended Cloudflare account and
  environment configuration.
- The repository integration harness replays the committed Drizzle migration
  journal against PGlite. It is the fast migration-chain check, not proof that
  a hosted restore or provider migration has succeeded.
- The credential-free health smoke command checks both public operational
  endpoints after a deployment:
  `bun run smoke:health -- https://<deployment-origin>`.
  It requires HTTP 200, a healthy `christ-dina` payload, and database readiness
  on `/readyz`; use `SMOKE_BASE_URL` instead of the positional URL in CI or a
  deployment shell. It never logs the base URL or sends credentials.

## Required promotion order

### Application-only change

1. Open a pull request and wait for the pull-request quality gate.
2. Merge to `main` and wait for the serialized main release gate.
3. Deploy the reviewed commit with the normal Cloudflare deployment path.
4. Run `bun run smoke:health -- https://<deployment-origin>` and the affected
   journey smoke checks in the observability runbook.
5. Watch Better Stack Errors, Logs & Traces, Uptime, and Cloudflare for the
   first release window. Record the release and environment when investigating
   a regression.

### Change that includes a migration

1. Design the schema change as backward-compatible expand/contract work before
   generating SQL.
2. Generate a new migration with `bun run db:generate`; never edit an applied
   migration or use `bun run db:push` against a hosted branch.
3. Run `bun run test:integration` and the normal pull-request quality gate.
4. Merge to `main` and wait for the main release gate plus the dependent
   development migration and synthetic seed to finish successfully.
5. Exercise the changed application against the hosted `development` branch.
   Verify the migration, affected authenticated read/write path, and any
   Storage/Auth behavior using synthetic data only.
6. Promote the same reviewed commit to the protected `production` branch.
   Confirm the production migration workflow applies the same migration chain
   successfully; do not run a second hand-written SQL variant.
7. Deploy the application after the production schema is ready, unless the
   expand/contract plan explicitly requires a backward-compatible application
   deploy before the migration. The old and new application versions must both
   work with the intermediate schema.
8. Run `bun run smoke:health -- https://<production-origin>` and the affected
   journey smoke checks. Confirm production `/healthz` and `/readyz` are both
   healthy before closing the rollout.
   Confirm the new release is visible in Better Stack with symbolicated source
   maps before closing the rollout.

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
   later migration after the rollback window has ended.

Avoid combining destructive changes, long-running backfills, and unrelated
application behavior in one migration. A migration must be safe to retry using
Drizzle's migration history and must preserve the constraints relied on by
application idempotency.

## Rollback decision tree

| Failure                                         | First action                                                                                      | Database action                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cloudflare application regression               | Redeploy the last known-good Worker version and run smoke checks                                  | None if the schema is backward-compatible                                                               |
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
- the exact migration filename and commit promoted to both environments;
- hosted development migration and synthetic seed;
- development smoke checks for `/healthz`, `/readyz`, and the affected path;
- production migration workflow and production smoke checks;
- Better Stack release/environment/source-map verification;
- Cloudflare deployment version and rollback target; and
- follow-up owner/date for any deferred contract cleanup.

Keep the evidence in the team's normal launch or operations record. Never paste
raw logs, credentials, full SQL exports, user data, or private provider error
messages into repository or Notion documentation.

## Manual controls still required

The following are intentionally not automated by this repository and must be
completed in the external systems before Phase 3 is considered operational:

- protect the `production` branch and require the green main release gate;
- require approval for the GitHub `production` environment;
- confirm the Cloudflare deployment points at the intended Worker/account;
- configure Better Stack release/source-map verification and rollback alerts;
- rehearse one application rollback and one migration incident response; and
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
