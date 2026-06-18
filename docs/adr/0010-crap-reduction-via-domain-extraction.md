# ADR 0010 — CRAP Reduction via Domain Extraction

**Status:** Accepted  
**Date:** 2026-06-15

## Context

`fallow health` reports **138 CRAP findings** (21 critical, 46 high, 71 moderate). Every one is
`exceeded: "crap"` — none breach the cyclomatic (≤20) or cognitive (≤15) limits. The code
already passes those gates; the problem is **untested complexity**: branchy functions with
`coverage_tier: "none"`, so `CRAP = CC² · (1 − cov)³ + CC` stays high.

The quality gate (`bun run quality:gate` → `fallow audit --base main`) already blocks _newly
introduced_ CRAP via fallow's `introduced` flag, so the pile cannot regrow. What is missing is
a single, durable method for **paying down the existing 138** that every contributor (and every
cloud agent) follows the same way. This ADR is that playbook; it is binding like the rules in
`docs/rules/complexity.md`, which it operationalizes.

## Decision

Pay down CRAP by **extracting logic into the feature's `src/utils/<feature>/domain/` layer and
covering it with unit tests**, built **test-first (TDD)**. We do not lower CRAP with jsdom /
render tests, and we do not suppress findings to avoid the work.

### Method — TDD, red→green→refactor, vertical slices

Per the `tdd` skill, drive each extraction one test at a time:

1. **Tracer bullet** — write one failing test for one observable behavior (`bun run test` →
   RED), then the minimal domain code to pass (GREEN).
2. **Incremental loop** — repeat one behavior per cycle until the function's behavior is
   covered. The existing function's known behavior **is** the spec (this is characterization of
   working code).
3. **Refactor call sites only once GREEN** — never refactor while RED.

Tests bind to the **public function signature only**, so the subsequent call-site swap is a
behavior-preserving refactor and the tests stay green throughout. **Do not** write all tests up
front then all code (horizontal slicing) — that produces tests of imagined shape, not behavior.

### Two fixes, by function kind

- **Pure function / hook** (e.g. `getYoutubeVideoId`, `getUserFriendlyError`, a hook's
  `handleKeyDown`): TDD a canonical copy into `src/utils/<feature>/domain/<name>.domain.ts` with
  a colocated `<name>.domain.test.ts` at 100% coverage, then swap the original site to import
  it. Coverage rises → CRAP collapses. No behavior change.
- **React component / route body** (e.g. `EvaluationOverlay`, `MediaCard`, `SignupForm`):
  extract the pure view-model logic — initial-value/input builders, validation, mode/branch
  derivation — into `src/utils/<feature>/domain/` and unit-test it. The component shell shrinks
  to orchestration, so its cyclomatic/cognitive — and therefore CRAP — fall under threshold.
  **Never** add `*.test.tsx` render tests. Use a colocated `<name>.logic.ts` only for glue that
  genuinely does not belong in the shared domain layer.

The `src/utils/**/domain/**` glob is already in `vitest.config.ts` coverage at 100%
lines/branches/functions/statements, so extracted domain files are gated automatically with no
config change.

### Sequencing

- **Phase A — pure functions / hooks**, then **Phase B — components**.
- Within each phase, work **critical → high → moderate**.

Rationale: pure extractions are cheap, low-risk, and drop CRAP fastest, so they front-load the
burndown; component view-model extraction is higher-effort and follows once the pure wins are
banked.

### Definition of done (per target)

- The function no longer appears in `bunx fallow health --format json --quiet`.
- `bun run test:coverage` green at 100% for the new domain file.
- `bun run quality:gate` and `bun run typecheck` clean.
- **No behavior change** (tests bound to the public interface stay green across the swap).

### Worked example (first target)

`getYoutubeVideoId` existed twice with divergent implementations —
`src/components/library/MediaCard.tsx` (CRAP 156) and `src/routes/_authed/library/index.tsx`
(CRAP 132). It was TDD'd into `src/utils/library/domain/youtube.domain.ts` (+
`youtube.domain.test.ts`) and both sites now import it. This removed **two CRAP findings and a
fallow duplicate** in one behavior-neutral change — the canonical pattern for Phase A.

### Tracking

Progress is the `fallow health` finding count; baseline **138 (21 critical / 46 high / 71
moderate)** as of 2026-06-15. The gate prevents regressions, so the count only moves down.

## Alternatives Considered

- **Render/jsdom tests on components to buy coverage** — rejected. They couple to UI structure,
  break on refactor, and `docs/rules/complexity.md` already forbids them; coverage stays scoped
  to logic.
- **`fallow-ignore` suppressions to clear findings** — rejected as a paydown tool. Suppression
  is reserved for genuinely irreducible logic (e.g. exhaustive switches) with a justification;
  using it to dodge testing hides risk instead of removing it.
- **Lower the CRAP threshold / disable the metric** — rejected. CRAP is the signal that churny,
  branchy code is untested; muting it defeats the purpose.
- **Big-bang refactor of all hotspots at once** — rejected. Violates Surgical Changes; large
  untested refactors are exactly the risk CRAP flags. Incremental TDD slices keep each change
  reversible and reviewable.

## Consequences

- A consistent, low-risk paydown method that any contributor or cloud agent applies identically;
  each cleaned target ships with tests, not just a lower number.
- Business/view-model logic migrates into the tested `domain/` layer over time, reinforcing the
  three-layer architecture of ADR 0004 and the coverage strategy of ADR 0003.
- Component shells get thinner and more orchestration-only, improving readability and future
  testability.
- The work is open-ended (138 findings); it proceeds opportunistically in the Phase A → Phase B
  order rather than as one blocking effort. Untouched legacy complexity is paid down only when
  its function is the target — no drive-by refactors.

See also: ADR 0003 (unit-testing strategy), ADR 0004 (three-layer `src/utils/` architecture),
and `docs/rules/complexity.md` (the enforced complexity/CRAP rule).
