# ADR 0009 — Integration Testing via PGlite

**Status:** Accepted  
**Date:** 2026-06-06

## Context

Unit tests cover the pure `domain/` layer to 100% (ADR 0003), but the `service/`
and `repository/` layers — authorization orchestration and real Drizzle SQL —
were exercised only in production. We wanted automated tests that run the actual
SQL against the actual schema, so that changes to repositories, joins, ordering,
or status-derivation wiring fail a test instead of a user. The constraint: **no
Docker** in the local/CI toolchain.

## Decision

Use **PGlite** (`@electric-sql/pglite`), an in-memory WASM Postgres, as the
integration-test database. A separate `vitest.integration.config.ts` runs
`src/**/*.integration.test.ts` with no coverage gate; the unit config excludes
those files so the 100% domain gate is unaffected. Tests target the **service**
layer with real DB-backed authz.

Three choices worth recording:

1. **Seam = Vitest alias, not a production change.** The integration config
   aliases the exact specifier `@/db` → a PGlite-backed test module (and `@/env`
   → a dummy-config stub). Repositories' `import { getDb } from '@/db'`
   transparently hit PGlite. Production `src/db/index.ts` / `src/env.ts` — and
   their `cloudflare:workers` import — are never loaded in tests. We rejected the
   alternative of branching inside production `getDb()` on a test env flag.

2. **Supabase-stub prelude + replay the real migrations.** Before migrating we
   create an `auth` schema, an `auth.uid()` stub, and the `authenticated` /
   `anon` / `service_role` roles, so the migrations' RLS policy DDL parses. RLS
   is inert in tests (PGlite runs as superuser/owner, which bypasses RLS — as
   production does connecting as table owner via Hyperdrive). We replay the real
   `drizzle/` SQL rather than pushing from the schema, to test the production
   schema-build path.

3. **Custom statement runner tolerating policy idempotency errors.** PGlite
   tracks RLS-policy → table dependencies differently from the Supabase Postgres
   the migrations were authored against: in `0015`, `DROP TABLE "inquiries"
   CASCADE` auto-drops a policy on `inquiry_responses` whose `USING` references
   `inquiries`, after which the migration's explicit `DROP POLICY` fails with
   "policy does not exist". We therefore replay statement-by-statement and ignore
   **only** policy-statement errors with SQLSTATE `42704` (undefined_object) or
   `42710` (duplicate_object); all other failures throw. This is why we don't use
   `drizzle-orm/pglite/migrator` directly.

## Alternatives considered

- **Docker + Testcontainers / real Postgres** — highest fidelity, but Docker is
  the dependency we're explicitly avoiding for local + CI.
- **Supabase local (CLI)** — heavyweight, also Docker-based.
- **drizzle-kit push from the schema** — sidesteps the migration churn, but
  doesn't exercise the real migration path and still emits the same RLS DDL.

## Consequences

- New integration tests go in `*.integration.test.ts` next to the code, target
  the service layer, and seed rows via `test/integration/seed.ts`. See
  `docs/TESTING_GUIDE.md` for the harness walkthrough.
- Features whose orchestration lives in a `createServerFn` (not a `service/`)
  need a thin service extraction to get a testable seam — done for enrolment's
  `setEvaluationScoreService` as the first instance.
- The tolerant migration runner is a known, scoped deviation: if a future
  migration legitimately fails on a policy statement, the runner will mask it.
  Non-policy DDL still fails loudly, which is the coverage that matters here.
- `bun run test:all` (unit + integration) is the full release signal.
