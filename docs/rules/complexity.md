---
name: complexity
scope: src/components/**, src/routes/**, src/utils/** (server functions)
enforced-by: bun run quality:gate (fallow `introduced` complexity) + ESLint (warn)
---

# Keep new components and endpoints under the complexity limits

## Rule

A **new or changed** function — React component, custom hook, route component, or TanStack
server function — must stay under all of:

- **Cyclomatic complexity ≤ 20** _(enforced)_
- **Cognitive complexity ≤ 15** _(enforced)_
- **Body ≤ 60 lines** (target; treat >60 as a refactor signal)

The two enforced limits match the `fallow health` thresholds (`maxCyclomatic 20` /
`maxCognitive 15`). The rule governs the code your change introduces — it does not require
refactoring untouched legacy functions.

> Fallow also reports **CRAP** (complexity × missing coverage). The gate does **not** block on
> CRAP alone — a simple but untested function is a coverage concern, not a complexity one. High
> CRAP with low cyclomatic/cognitive means "add tests," and is advisory here.

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

## Enforcement

`bun run quality:gate` runs `fallow audit` against the base branch and **fails** if your
change introduces any complexity finding (fallow's `introduced: true` flag). Pre-existing
complexity in files you don't touch does not block.

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
