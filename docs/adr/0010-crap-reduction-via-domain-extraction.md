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
- **Prefer duplicated targets first within a tier.** Run `bunx fallow dupes --format json`; a
  helper that exists in N files is an N-for-one win — a single extraction clears every copy's
  CRAP finding *and* removes the fallow duplicate. (The first target cleared two copies; a
  later sweep found a third.)

Rationale: pure extractions are cheap, low-risk, and drop CRAP fastest, so they front-load the
burndown; component view-model extraction is higher-effort and follows once the pure wins are
banked.

### Reconciling divergent near-duplicates

"Duplicates" are often **not identical** — copies drift (one handles `/shorts/`, another
normalizes scheme-less URLs, etc.). Unify them onto the **superset** canonical util, but only
after confirming, per call site, that the extra branches are either **inert** (that input never
reaches the site) or a **safe broadening** (the site now handles a URL it previously rejected,
which is an improvement, not a regression). Because the shared util's tests already specify the
superset behavior at 100%, the call-site swap stays a pure refactor against a green spec — you
do **not** write new tests for an already-tested superset; you only verify the delta is benign.
Note any deliberate broadening in the commit message so it is not mistaken for an accident.

### Definition of done (per target)

- The function no longer appears in `bunx fallow health --format json --quiet`.
- `bun run test:coverage` green at 100% for the new domain file.
- `bun run quality:gate` and `bun run typecheck` clean.
- **No behavior change** (tests bound to the public interface stay green across the swap), or a
  deliberate **broadening** noted per "Reconciling divergent near-duplicates".

### Verification — the fast loop (don't run the full gate every cycle)

The full `bun run quality:gate` re-runs the entire unit + integration suites **and**
`fallow audit --base main`, which lists every *pre-existing* branch-vs-`main` finding. That
noise is irrelevant to a paydown target and the suites are slow, so don't use it as the inner
loop. Instead:

1. **Progress metric (cheap, no test run):** `bunx fallow health --format json --quiet` — the
   target finding is gone and the total dropped. This *is* the burndown number.
2. **Coverage of the new domain file:** `bun run test:coverage` (or a scoped `vitest run` on the
   `*.domain.test.ts` during red→green).
3. **Isolate *introduced* complexity, not the whole branch:** the gate only blocks on fallow's
   `introduced` flag, but `--base main` computes that against the whole branch diff. Scope it to
   *your* change by pointing the base at the commit immediately before the target —
   `QUALITY_BASE=<pre-change-ref> bun run quality:gate` (e.g. `QUALITY_BASE=HEAD` to check
   working-tree changes before committing). The verdict then reflects only what this target
   introduced, not unrelated pre-existing findings.
4. **Full `bun run quality:gate` once** before the commit, as the final pre-flight.

### Worked example (first target)

`getYoutubeVideoId` existed **three** times with divergent implementations —
`src/components/library/MediaCard.tsx` (CRAP 156), `src/routes/_authed/library/index.tsx`
(CRAP 132), and `src/components/library/MediaDetailViewer.tsx` (CRAP 90). It was TDD'd into
`src/utils/library/domain/youtube.domain.ts` (+ `youtube.domain.test.ts`) and all three sites
now import it. The first two were behavior-neutral swaps; the third was a **safe broadening**
(its local copy lacked scheme-less normalization and `/shorts/`, so it now embeds URLs it
previously rejected) reconciled onto the already-tested superset — no new tests needed. This
removed **three CRAP findings and the fallow duplicate** — the canonical pattern for Phase A.

### Tracking & the progress ledger

Progress is the `fallow health` finding count; baseline **138 (21 critical / 46 high / 71
moderate)** as of 2026-06-15. The gate prevents regressions, so the count only moves down.

The **ledger** below is the durable record of what has been fixed and what is being worked on
right now. It is the single source of truth for the burndown — keep it current as part of every
target's change, not as an afterthought.

#### Protocol — claim before you work (safe for parallel agents)

So multiple agents (local or cloud) can pay down findings at once without colliding:

1. **Claim first.** Before touching a target's files, add (or flip) its ledger row to
   `🔨 in progress` with your agent/author id and the date, and **commit that claim on its own**
   (`gt c -m "chore(crap): claim <target>"`) so other workers see it immediately.
2. **Pick only `⬜ todo` rows.** Never start a target already marked `🔨 in progress` — take the
   next unclaimed one instead. A merge conflict on this table means someone claimed it first:
   yield and pick another row.
3. **Record on completion.** When the target is done, flip its row to `✅ done` with the date,
   the domain file created, and the finding(s)/duplicate(s) cleared — this is the "what is
   fixed" record. Drop the new `fallow health` total in the count above.
4. **Release if you abandon it.** If you stop without finishing, flip the row back to `⬜ todo`
   so it is not stranded as permanently "in progress".

#### Ledger

| Status         | Target (function)  | Kind   | Files / sites                                                                                                | Domain file                              | Cleared                          | Agent / date           |
| -------------- | ------------------ | ------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | -------------------------------- | ---------------------- |
| ✅ done        | `getYoutubeVideoId` | Phase A pure | `MediaCard.tsx`, `routes/_authed/library/index.tsx`, `MediaDetailViewer.tsx`                                  | `src/utils/library/domain/youtube.domain.ts` | 3 CRAP findings + 1 fallow dupe | hessuew / 2026-06-15   |
| 🔨 in progress | `getUserFriendlyError` | Phase A pure | `components/auth/login-form.tsx`                                                                              | `src/utils/auth/domain/login-error.domain.ts` | 1 CRAP finding (target 156)     | hessuew / 2026-06-15   |

Add a new row per target. Leave the table as the live worklist; do not delete `✅ done` rows —
they are the fix history.

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
- The progress ledger + claim protocol let **multiple agents pay down findings in parallel**
  without colliding (claim a row → others skip it) and make the remaining burndown visible at a
  glance.

See also: ADR 0003 (unit-testing strategy), ADR 0004 (three-layer `src/utils/` architecture),
and `docs/rules/complexity.md` (the enforced complexity/CRAP rule).
