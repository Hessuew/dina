# ADR 0003 — Unit Testing Strategy

**Status:** Accepted — expanded by [ADR 0026](./0026-jsdom-tests-for-hooks-and-components.md) for hook and component tests  
**Date:** 2026-05-17

## Context

The project had no unit tests. Releases depended entirely on manual verification. We needed trustworthy automated tests so that a full green run can be treated as a release signal.

## Decision

Use **Vitest** (already installed) with the following constraints:

- **Scope:** `src/domain/` only — pure functions with no HTTP or DB dependencies
- **Location:** Co-located `.test.ts` files next to each source file (e.g. `grade.service.test.ts`)
- **Coverage:** 100% lines/statements/branches/functions on all files in `src/domain/` (barrel `index.ts` excluded)
- **DB-touching functions:** Excluded from testing. Marked with `/* v8 ignore start/end */` in source so coverage thresholds remain honest
- **Environment:** `node` (no DOM required for domain-layer tests)
- **CI gate:** `bun run test` must pass before deploy

## Why domain layer first

Domain services hold the business rules (grade calculation, assignment validity windows, permission checks, post transformations). They are pure functions — no mocks, no fixtures, deterministic output. This makes them the highest-trust, lowest-maintenance tests in the codebase.

## What is NOT tested here

> Hooks and components are no longer categorically excluded — co-located jsdom
> tests cover behavioral invariants a domain test cannot express
> ([ADR 0026](./0026-jsdom-tests-for-hooks-and-components.md)). The
> server-function and DB-touching exclusions still stand.

- React hooks (`src/hooks/`) — require jsdom + React testing library setup (now covered per ADR 0026)
- UI components (`src/components/`) — integration-level concerns (see ADR 0026 for the jsdom exception)
- Server functions (`src/utils/`) — thin adapters over domain logic; covered implicitly
- DB-touching functions — require a real database; belong in integration tests

## Consequences

- Every new function added to `src/domain/` must include tests to pass coverage
- `bun run test:coverage` enforces the 100% threshold and will fail CI if coverage drops
- Hook and component expansion landed in [ADR 0026](./0026-jsdom-tests-for-hooks-and-components.md); further scope expansion requires a separate ADR updating scope
