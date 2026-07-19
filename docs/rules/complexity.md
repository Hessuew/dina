---
name: complexity
scope: src/components/**, src/routes/**, src/utils/** (server functions)
enforced-by: focused static verification locally + PR CI quality gate
---

# Keep new components and endpoints under the complexity limits

## Rule

A **new or changed** function — React component, custom hook, route component, or TanStack
server function — must stay under all of:

- **Cyclomatic complexity ≤ 20** _(enforced)_
- **Cognitive complexity ≤ 15** _(enforced)_
- **CRAP under threshold** — must not introduce a fallow CRAP finding _(enforced)_
- **Body ≤ 60 lines** _(enforced — plan decomposition before writing, not after; see Pre-write checklist below)_

The enforced complexity limits match the `fallow health` thresholds (`maxCyclomatic 20` /
`maxCognitive 15`). The rule governs the code your change introduces — it does not require
refactoring untouched legacy functions.

> **CRAP** (complexity × missing coverage, `CC² · (1 − cov)³ + CC`) is now enforced too: a
> new/changed function must not introduce a fallow CRAP finding. A function can be under both
> complexity limits yet still trip CRAP because it has no coverage — the fix is to **add tests
> or simplify** (see How to comply). High CRAP is the gate's "this churned/branchy code is
> untested" signal, and it blocks submit like cyclomatic/cognitive.

## Why

`fallow health` already reports 28 CRITICAL functions (both thresholds exceeded), almost all
large dialogs, forms, tables, and route bodies. Complex functions are the hardest to test,
review, and change safely. Blocking _new_ complexity stops the pile from growing while legacy
hotspots are paid down separately.

## Pre-write checklist — new components and functions

Run this **before writing the first line** of any new function, component, or hook:

1. **Budget the body to ≤ 60 lines before writing.** If the spec implies more, name the sub-units now:
   - JSX sub-trees → named sub-component functions in the same file (each ≤ 60 lines)
   - Branchy logic → `domain/` pure function + 100% unit test (`<name>.domain.ts` / `.domain.test.ts`)
   - State + async handlers → `useXxx` hook function (same file or its own file)
2. **Write bottom-up: domain → hook → shell.** Smallest, testable unit first.
3. **Verify each function as you write it** — count the body, split immediately if > 60. Every extracted sub-component must itself pass the 60-line test (decomposition is recursive).
4. **Never write a monolith and split later.** Post-hoc splits produce oversized sub-functions that fail the same gate.

## How to comply

- **Extract** named helper functions, custom hooks (`useThing`), and subcomponents instead of
  one large body.
- **Flatten** nested conditionals with early-return guard clauses.
- **Push business logic into `src/domain/`** pure services (see ENGINEERING_GUIDE "Domain
  services"). Server functions in `src/utils/**` stay thin adapters: validate → call domain →
  return. Route/component bodies orchestrate; they don't hold the rules.
- Prefer many small, named units over one clever one.

### Lowering component CRAP

Don't chase component CRAP with render tests (no jsdom / `*.test.tsx` — coverage stays scoped
to logic). Instead, extract a component's pure view-model logic — initial-value builders, input
builders, validation, mode/branch derivation — into the feature's existing
`src/utils/<feature>/domain/` folder (already covered at 100% via the `src/utils/**/domain/**`
glob) and unit-test it there. The component shell then only orchestrates, so its
cyclomatic/cognitive — and therefore CRAP — drop below threshold. Use a colocated `*.logic.ts`
next to the component only for glue that genuinely doesn't belong in the shared domain layer.

## Enforcement

`bun run verify:focused:static` runs the changed-diff Fallow audit locally when applicable.
Pull-request CI runs `bun run quality:gate` exactly once against `origin/main`. Both fail if a
change introduces any complexity finding — cyclomatic, cognitive, or CRAP — via Fallow's
`introduced: true` flag. Pre-existing complexity in files you don't touch does not block.

ESLint (`complexity`, `max-lines-per-function`) emits **warnings** on changed files for fast
local feedback; the hard block is the gate above.

## Escape hatch

When a function is genuinely irreducible (e.g. an exhaustive switch), suppress it with a
justification on the line above the declaration:

```ts
// fallow-ignore-next-line complexity — exhaustive event-type switch, no branching logic
function reducer(state, event) {
  /* ... */
}
```

Use sparingly. A suppression without a reason is a code-review failure.

The same discipline applies to the **100% domain-coverage** gate (`vitest.config.ts`, enforced on
`src/**/domain/**` and `src/components/**/*.domain.ts`). It stays at 100% — do not lower it or
write hollow tests to buy the number. The only sanctioned exception is a **genuinely unreachable**
defensive branch (e.g. a `?? DEFAULT` after an exhaustive enum lookup), suppressed with a
justified v8 ignore directive:

```ts
/* v8 ignore next -- defensive default, enum lookup is exhaustive */
return TYPE_CHIP[event.type] ?? TYPE_CHIP.other
```

Never use it to skip a reachable, simply-untested branch — write the test. An unjustified
`v8 ignore` is a code-review failure. See ADR 0010 for the full coverage-escape-hatch policy.
