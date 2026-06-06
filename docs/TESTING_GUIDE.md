# Testing Guide

How we test server-side logic in this codebase, using the `zoomLink` endpoints
as the worked example. Read this before adding tests for a new endpoint.

## TL;DR

- **Pure business logic lives in a `domain/` layer and is unit-tested to 100%.**
- IO (DB, auth) is pushed out to `repository/` and `service/` layers that are
  **deliberately excluded** from the coverage gate.
- Run `bun run test` (or `bun run test:coverage`) — both must stay green.
- Integration tests (against a real DB) are **not built yet**; the planned
  approach is documented at the end.

## Why the layering makes testing easy

Each `src/utils/<feature>/` module is split into four layers (reference:
`src/utils/courses/`, `src/utils/zoomLink/`):

| Layer      | File                                | Responsibility                                                            | Tested?        |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------- | -------------- |
| Server fn  | `zoomLink.ts`                       | `createServerFn` → `getCurrentUser()` → service. Thin.                    | No (excluded)  |
| Service    | `service/zoomLink.service.ts`       | Auth (`authz`/`hasRole`/`withRequestCache`), orchestration, typed errors. | No (excluded)  |
| Repository | `repository/zoomLink.repository.ts` | DB access via `getDb()`. Wrapped in `/* v8 ignore */`.                    | No (excluded)  |
| Domain     | `domain/zoomLink.domain.ts`         | Pure functions — mapping, normalization, rules. No IO.                    | **Yes — 100%** |

Because the `domain/` layer has no database or network calls, its functions are
deterministic and can be unit-tested with plain inputs and outputs — no mocks,
no fixtures, no DB. That is the whole point of the split: keep the testable
logic pure, and keep the untestable IO thin enough that it doesn't need a unit
test.

## Unit tests (how we do them today)

### Location & naming

Tests live next to the code they cover:
`src/utils/<feature>/domain/<feature>.domain.test.ts`. Vitest discovers them via
`src/**/*.test.ts` (see `vitest.config.ts`).

### Conventions

- Use Vitest `describe` / `it` / `expect`.
- One `describe` per exported function; one behavior per `it`.
- Use a **factory helper** `makeX(overrides)` to build inputs, so each test
  states only what's relevant. See `makeLesson` in
  `src/utils/calendar/domain/calendar.domain.test.ts` and `makeZoomLinkRow` /
  `makeCreateInput` in
  `src/utils/zoomLink/domain/zoomLink.domain.test.ts`.
- **Inject time and other ambient values as parameters.** Domain functions must
  not call `Date.now()` / `new Date()` internally — e.g.
  `buildUpdateZoomLinkValues(data, now)` takes `now` so the test can assert an
  exact `updatedAt`. (Compare `AssignmentService.validateSubmissionWindow(assignment, now)`.)
- **Cover every branch.** The coverage gate is 100%, so each `||`, `??`, and
  conditional needs a test on both sides. For `zoomLink` that means: empty vs.
  provided `description`/`courseId`, missing vs. explicit `orderIndex` (including
  `0`), and null vs. non-null `courseTitle`.

### The coverage gate

`vitest.config.ts` only measures coverage for the pure layer:

```ts
coverage: {
  include: ['src/domain/**', 'src/utils/**/domain/**'],
  thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
}
```

So a new `domain/` file is automatically held to 100%. Repository files are
additionally wrapped in `/* v8 ignore start */ … /* v8 ignore end */` so any
stray inclusion never drags the number down.

### Commands

```bash
bun run test            # run all unit tests once
bun run test:coverage   # run with coverage + enforce the 100% gate
```

## Checklist: adding a new endpoint (test-ready)

1. **Schema** — input validation in `src/schemas/<feature>.schema.ts` (Zod).
2. **Repository** — `repository/<feature>.repository.ts`: all `getDb()` calls,
   wrapped in `/* v8 ignore */`. Re-export via `repository/index.ts`.
3. **Domain** — `domain/<feature>.domain.ts`: pure mapping/normalization/rule
   functions. Inject time/IDs as params.
4. **Service** — `service/<feature>.service.ts`: auth + orchestration; call
   repository, then domain; throw typed errors from `src/utils/errors.ts`.
5. **Server fn** — `<feature>.ts`: thin `createServerFn` adapters
   (`getCurrentUser()` → service). Re-export domain types for consumers.
6. **Unit tests** — `domain/<feature>.domain.test.ts` covering every branch.

## Integration tests (PGlite — built)

Service + repository layers are exercised against a real Postgres schema using
**PGlite** (`@electric-sql/pglite`) — an in-memory Postgres, no Docker, same SQL
dialect as production. See ADR 0009 for the rationale.

### Commands

```bash
bun run test:integration   # integration suite only (PGlite)
bun run test:all           # unit suite + integration suite (the full signal)
```

`bun run test` / `test:coverage` stay unit-only: the unit config excludes
`src/**/*.integration.test.ts`, so the 100% domain coverage gate is unaffected.

### How the harness works (`test/integration/`)

- **`vitest.integration.config.ts`** — `include: ['src/**/*.integration.test.ts']`,
  no coverage block, `setupFiles: ['./test/integration/setup.ts']`, and a
  `resolve.alias` that maps the **exact** specifier `@/db` → `test/integration/db.ts`
  and `@/env` → `test/integration/env.ts`. Aliasing is the whole seam: production
  `src/db/index.ts` and `src/env.ts` are untouched, and their `cloudflare:workers`
  import never enters the test graph. (`@/db/schema` and every other `@/` path
  still resolve normally via `vite-tsconfig-paths`.)
- **`db.ts`** — boots one `PGlite`, wraps it with `drizzle(client, { schema })`
  from `drizzle-orm/pglite`, and exports `getDb()` (the shared instance every
  repository's `import { getDb } from '@/db'` now hits), plus a `truncateAll()`
  helper. Vitest isolates each test file, so each file gets its own fresh DB.
- **`prelude.sql`** — creates Supabase stubs (`auth` schema, `auth.uid()`,
  `authenticated`/`anon`/`service_role` roles) so the migrations' RLS policy DDL
  parses. RLS is inert in tests (PGlite runs as superuser/owner → RLS bypassed,
  as production does via Hyperdrive).
- **`setup.ts`** — runs the prelude, then replays the real `drizzle/` migrations
  in journal order, **statement by statement**, tolerating only policy-statement
  idempotency errors (see note). Resets authz to `DefaultAuthorizationService`
  (so role checks hit seeded `profiles` rows) and `truncateAll()` in `beforeEach`.
- **`seed.ts`** — `seedProfile` / `seedCourse` / `seedEnrollment` /
  `seedReviewerAssignment` factories, mirroring the unit-test `makeX` style.

> **Why a custom migration runner instead of drizzle's pglite migrator?** PGlite
> tracks RLS-policy → table dependencies differently from the Supabase Postgres
> the migrations were authored against. In `0015`, `DROP TABLE "inquiries" CASCADE`
> auto-drops a policy defined on `inquiry_responses` whose `USING` clause
> references `inquiries`; the migration's own later `DROP POLICY` then hits
> "policy does not exist". Since RLS is inert here, the runner ignores **only**
> policy-statement idempotency errors (SQLSTATE 42704 / 42710) and lets every
> other failure (tables, columns, enums, constraints) throw.

### Writing a test

Target the **service** layer (real DB, real authz), seed the rows it reads, then
assert. Worked examples:

- `src/utils/zoomLink/zoomLink.integration.test.ts` — create/get/update/delete +
  admin-role enforcement.
- `src/utils/enrolment/enrolment.integration.test.ts` — the assigned Reviewer's
  score auto-derives enrollment `status` (ADR 0008), frozen states stay put, and
  non-assigned evaluators stay advisory.

> Enrolment had its score→status orchestration inside the `setEvaluationScore`
> server fn. To get a testable service seam (matching every other feature), that
> body was extracted to `setEvaluationScoreService(data, userId)` in
> `src/utils/enrolment/service/enrolment.service.ts`; the server fn now just calls
> `getCurrentUser()` then the service.
