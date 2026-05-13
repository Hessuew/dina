---
name: stack-planner
description: >
  Converts git working directory changes into bounded intent-based Graphite stacks.
  Produces CI-safe, review-friendly stacked branches on top of the current Graphite branch state.
  Uses non-interactive Graphite CLI only. Max 5 stacks per run. Never submits PRs or mutates existing stacks unless explicitly requested.

  **IMPORTANT:**
  - Stacks are always created on top of the CURRENT active Graphite branch context.
  - Never reset, rebase, or recreate stacks from main or any other base branch.
  - Never use stash or branch switching workflows.

  **Use when user says:**
    - "create pr"
    - "new pr"
    - "split PRs"
    - "create graphite stack"
    - "stack these changes"
---

# Graphite Stack Planner — v5.1 (Stack-on-top safe mode)

## 0. Core intent

Convert:  
`git diff` → intent clusters → dependency-safe stacks → Graphite execution

**Key constraint:**  
Stacks are ALWAYS created on top of the current active branch context in Graphite.

Graphite is execution layer only.

---

## 1. Hard safety rules (non-negotiable)

- Never submit PRs unless explicitly requested
- Never restack, rebase, or rewrite existing stacks unless explicitly requested
- Never switch branches (no checkout, no main reset, no --onto main patterns)
- Never use git stash or stash slicing workflows
- Never reconstruct stacks from main
- Max 5 stacks per run
- Always use non-interactive Graphite commands only

**If state is unclear:**  
→ stop and ask user

---

## 2. Allowed Graphite execution

**Only allowed command:**

```bash
gt c --ai --no-interactive
```

**Rules:**

- runs once per stack
- executed in dependency order (bottom → top)
- stacks are created on top of CURRENT Graphite branch state
- do NOT reset repo state before execution
- do NOT attempt to recreate base branches

---

## 3. Input requirements

**Required:**

- `git diff` / `git status` / current working tree changes

**Optional:**

- preferred stack count
- must-keep-together files

**Never assume:**

- main branch state
- external branch context
- stash state

---

## 4. Planning model (bounded heuristic only)

Use shallow reasoning only:

- changed file paths
- local subtree grouping
- obvious API/schema boundaries

Avoid:

- full repo dependency graphs
- cross-module speculation
- deep import analysis

---

## 5. Clustering rules

**Group by:**

**Strong split signals**

- API / schema / migration changes
- isolated feature subtrees
- infra changes
- independent frontend/backend slices

**Weak split signals (prefer merge)**

- folder-only separation
- formatting/refactors
- generated files
- tiny unrelated edits

**Tests**

- stay with feature they validate
- split only if stack size becomes excessive

**Shared code**

- place in earliest stack that unlocks dependents
- never duplicate shared edits

---

## 6. Stack limit policy

Default: minimize stack count  
Hard cap: 5 stacks

**If too many candidates:**  
merge in priority order:

- tests → refactors → infra → UI → features

---

## 7. Dependency rules (simple DAG)

Order:

- schema/API → backend → frontend → tests

**Rules:**

- no cycles
- no backward dependencies
- merge if coupling is unclear

---

## 8. Execution model (strict)

For each stack:

- ensure working tree contains only intended slice (no repo manipulation steps)
- run:  
  `gt c --ai --no-interactive`
- stacks are created on TOP of current Graphite branch context
- proceed bottom → top
- stop immediately on mismatch or failure

No recovery automation.

---

## 9. Forbidden operations

**DO NOT use:**

- git checkout (any branch switching)
- git reset / rebase / stash workflows
- gt submit
- gt restack / gt sync / gt modify
- gt c --onto main or any main-based reconstruction
- any workflow that rebuilds stacks from main

---

## 10. Ambiguity handling

**Ask user only if:**

- stack boundaries unclear
- dependency order ambiguous
- repo state inconsistent
- splitting affects CI safety

**Otherwise:**

- prefer conservative merge strategy
- proceed automatically

---

## 11. Output format (minimal)

For each stack:

```
Stack: <name>

Intent:
<1–2 lines>

Files:
<subtree only>

Depends on:
<none | previous stack>
```

---

## 12. Optimization goals

Prioritize:

- correctness under CI
- safe Graphite execution
- stack-on-top consistency
- low token usage
- repeatable behavior

Avoid:

- elaborate planning narratives
- full dependency modeling
- speculative architecture decomposition
