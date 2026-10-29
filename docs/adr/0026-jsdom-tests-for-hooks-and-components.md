# ADR 0026 — jsdom Tests for Hooks and Components

**Status:** Accepted  
**Date:** 2026-10-30

## Context

ADR 0003 scoped unit tests to `src/domain/` and deferred hooks and components to
"a separate ADR updating scope" — they needed jsdom and a React testing harness.
`docs/plan/UNIT_TESTS.md` listed the same expansion with setup steps.

The library viewer reliability work put behavioral invariants in effect and DOM
interactions that a pure domain test cannot express: a superseded PDF.js task
must never write state for the current document, a byte-identical signed-URL
reissue must still re-arm the load, and the reader surface must stay mounted
through load errors so fullscreen survives retries. `@testing-library/react` and
`jsdom` were already dev dependencies.

## Decision

- **Scope expands** to co-located hook and component unit tests
  (`<name>.test.ts` for hooks via `renderHook`, `<name>.test.tsx` for component
  renders) next to the code they cover.
- **Environment stays `node` globally.** Each jsdom test file opts in with a
  `// @vitest-environment jsdom` pragma on its first line — no global
  environment switch.
- **Discovery:** `vitest.config.ts` `include` gains `src/**/*.test.tsx`;
  `src/**/*.test.ts` already covers the hook tests.
- **Harness:** `@testing-library/react` (`render`, `renderHook`, `fireEvent`,
  `cleanup`) with `vi.mock` at module seams (router, `pdfjs-dist`).
- **Coverage gate unchanged.** `coverage.include` stays scoped to domain
  surfaces (`src/domain/**`, `src/utils/**/domain/**`, `src/hooks/**/domain/**`,
  `src/components/**/*.domain.ts`) at 100%. Hook and component tests are
  behavioral regression tests: they run under `bun run test` but are not a
  coverage target.
- **When to write one:** only for a behavioral invariant a pure domain test
  cannot express — DOM/effect interactions, remount identity, mounted-surface
  guarantees. Pure logic still extracts to a domain module first (ADR 0004) and
  jsdom tests are never a CRAP or unit-size paydown tool
  (`docs/rules/complexity.md`, ADR 0010, ADR 0011).

## Alternatives considered

- **Global `environment: 'jsdom'`** — rejected. It would pay the DOM setup cost
  for every test file; the per-file pragma keeps `node` the default and makes
  each DOM-dependent file self-declaring.
- **Route everything through integration tests** — rejected. The invariants
  under test (task cancellation, key remounts, mounted-surface identity) are
  unit-level and would be slower and less precise through PGlite or E2E.

## Consequences

- ADR 0003's "What is NOT tested here" entries for React hooks and UI
  components are superseded; its coverage gate and DB-touching exclusions
  stand.
- `docs/plan/UNIT_TESTS.md`'s expansion steps (jsdom opt-in, `include`
  pattern, this ADR) are satisfied.
- ADR 0010 and ADR 0011 remain binding for their programs: a jsdom test does
  not substitute for domain extraction in CRAP or unit-size paydown.
