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

## Integration tests (planned — not yet built)

There is currently **no integration-test harness and no integration tests**. The
service and repository layers are exercised only in production. When we add
integration coverage, the chosen approach is **PGlite**
(`@electric-sql/pglite`) — an in-memory Postgres that needs no Docker and runs
the same SQL dialect as production.

### What needs to be built

- **Dependency:** add dev dep `@electric-sql/pglite` plus the Drizzle PGlite
  driver.
- **Separate Vitest project/config** for `*.integration.test.ts`:
  - its own `include` glob (e.g. `src/**/*.integration.test.ts`),
  - **excluded from the unit coverage gate** above,
  - `setupFiles` that: boot a PGlite instance, run the Drizzle migrations from
    `drizzle/` against it, and reset/truncate tables between tests.
- **A `getDb()` seam.** `src/db/index.ts` currently resolves the connection from
  Cloudflare Hyperdrive / env. Integration tests need `getDb()` to return the
  PGlite-backed Drizzle instance under test — via an env flag or an injectable
  connection. This is the one production-touching change integration tests
  require; design it so production behavior is untouched.

### What `zoomLink` integration tests should assert

Running against the real (PGlite) schema, through the **service** layer:

- `createZoomLinkService` persists a row with normalized values.
- `getZoomLinksService` returns links joined to their `courseTitle`, ordered by
  `section`, `orderIndex`, then `title`, and includes the viewer's `role`.
- `updateZoomLinkService` mutates the row and bumps `updatedAt`.
- `deleteZoomLinkService` removes the row.
- Admin-role enforcement: non-admin callers are rejected by `authz`.

> Until the harness exists, these behaviors are guaranteed only by the pure
> domain unit tests plus manual/production verification. Building the PGlite
> harness is tracked as a follow-up.
