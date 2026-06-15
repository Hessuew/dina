---
name: complexity
scope: src/components/**, src/routes/**, src/utils/** (server functions)
enforced-by: bun run quality:gate (fallow `introduced` cyclomatic/cognitive/CRAP) + ESLint (warn)
---

# Keep new components and endpoints under the complexity limits

## Rule

A **new or changed** function — React component, custom hook, route component, or TanStack
server function — must stay under all of:

- **Cyclomatic complexity ≤ 20** _(enforced)_
- **Cognitive complexity ≤ 15** _(enforced)_
- **CRAP under threshold** — must not introduce a fallow CRAP finding _(enforced)_
- **Body ≤ 60 lines** (target; treat >60 as a refactor signal)

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

`bun run quality:gate` runs `fallow audit` against the base branch and **fails** if your
change introduces any complexity finding — cyclomatic, cognitive, or CRAP — via fallow's
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
