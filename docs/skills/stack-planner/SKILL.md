---
name: stack-planner
description: >
  Converts git working directory changes into bounded intent-based Graphite stacks,
  runs a hard quality gate, submits them as ready PRs, links them to Linear
  issues, and generates AI descriptions for each PR. Full pipeline runs uninterrupted after a single approval gate.
  Uses non-interactive Graphite CLI only. Max 5 stacks per run.

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

# Graphite Stack Planner — v7.0 (Quality-gated full pipeline)

## 0. Core intent

Convert:
`git diff` → intent clusters → stacks → hard quality gate → submit as ready PRs → link Linear → generate PR descriptions

**Key constraint:**
Stacks are ALWAYS created on top of the current active branch context in Graphite.

---

## 1. Hard safety rules (non-negotiable)

- Never restack, rebase, or rewrite existing stacks unless explicitly requested
- Never switch branches (no checkout, no main reset, no --onto main patterns)
- Never use git stash or stash slicing workflows
- Never reconstruct stacks from main
- Max 5 stacks per run
- Always use non-interactive Graphite commands only
- Never submit if the quality gate fails
- Never mutate files after Graphite stack commits are created

**One approval gate:** show the plan → user approves → full pipeline runs without further stops unless the quality gate blocks submission.

After the approval gate the full pipeline runs uninterrupted. graphite-linear-connector (Phase 5) resolves every PR automatically in pipeline mode — it never pauses, and auto-creates a Linear issue on low confidence. See the pipeline mode contract in the connector skill.

**If repo state is unclear:**
→ stop and ask user before doing anything

---

## 2. Allowed Graphite execution

**Stack creation (one per cluster, bottom → top):**

```bash
gt c --ai --no-interactive
```

**Deterministic quality gate:**

```bash
QUALITY_BASE=<base-ref> bun run quality:gate
```

**Pre-stack safe fixer:**

```bash
bun run quality:fix
```

**Submit all stacks as ready PRs:**

```bash
gt submit
```

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

## 8. Full pipeline execution (strict)

### Phase 1 — Plan

1. Run `git status` and `git diff` to collect changes
2. Cluster changes into stacks (sections 5–7)
3. Present plan to user (section 11 output format)
4. **Wait for approval — this is the only user gate**

The plan must state that `bun run quality:fix` may update already-changed working-tree files before commits are created. If that would change stack boundaries, stop and ask.

---

### Phase 2 — Prepare and Stack

1. Record the current base before creating new stack commits:

   ```bash
   git rev-parse HEAD
   ```

   Store the output as `QUALITY_BASE_COMMIT` for Phase 3.

2. Run the safe fixer before staging anything:

   ```bash
   bun run quality:fix
   ```

3. Re-run `git status` and `git diff`
4. If the fixer touched only files already covered by the approved stack plan, continue
5. If the fixer created unrelated changes or changed stack intent, stop immediately

For each cluster (bottom → top):

1. Stage only the files for this cluster:
   `git add <files-for-this-stack>`
2. Run:
   `gt c --ai --no-interactive`
3. Stop immediately on any failure — do not continue to next cluster

---

### Phase 3 — Hard Quality Gate

After all stacks are created and before `gt submit`, run read-only checks only. Do not run formatters, fixers, codemods, or any other file-mutating command in this phase.

1. Run the deterministic gate:

   ```bash
   QUALITY_BASE=<QUALITY_BASE_COMMIT> bun run quality:gate
   ```

   Blocks submit on:
   - changed-file format check failure
   - changed-file lint failure
   - TypeScript failure
   - unit test failure
   - integration test failure
   - Fallow `verdict: "fail"`

   `QUALITY_BASE=<QUALITY_BASE_COMMIT> bun run quality:gate` checks Prettier and ESLint only for files changed since the recorded base, then runs TypeScript, tests, and Fallow for full-stack signal. Fallow `verdict: "warn"` does not block, but summarize the warnings in the final output.

2. Invoke the **reviewing-code** skill against the exact newly-created stack diff

   Blocks submit on:
   - any review finding with severity `>=75`

   Review findings with severity `50–74` are advisory: include them in the final output, but continue submitting.

3. If any blocking check fails, stop before `gt submit` and report the failing gate

---

### Phase 4 — Submit

Only after Phase 3 passes:

```bash
gt submit
```

Run `gt log` after submit to collect the PR numbers and URLs for all submitted PRs.

---

### Phase 5 — Link Linear

Invoke the **graphite-linear-connector** skill in pipeline mode:

- Pass the explicit list of PR numbers/URLs collected in Phase 4
- Pass `--pipeline` flag (fully automatic, no confirmation stops)
- The connector returns a **PR → Linear issue mapping** (may be null per PR if no match)

See the connector skill's Pipeline Mode section for full contract.

---

### Phase 6 — Generate PR descriptions

For each submitted PR, generate a description using the template contract below and write it via:

```bash
gh pr edit <PR-number> --body-file /tmp/pr-<PR-number>.md
```

**Description contract** (matches `.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
**Related Linear Issue:** <Linear-issue-url>
<Include this header only if Phase 5 returned a Linear issue for this PR>

## What

<1-sentence summary derived from the commit title for this PR>

## Why

<≤2-sentence summary of the Linear issue purpose — from the PR→issue mapping returned in Phase 5>
<Omit this section entirely if Phase 5 returned no issue for this PR>

## Changes

<Intent-level bullets describing what behavior changed in this PR's slice only>
<Not file names — what behavior, what the user/system experiences differently>
```

**Sources per PR:**

- `What`: commit title / PR title for this stack slice
- `Why`: Linear issue description (summarize to ≤2 sentences); omit if null
- `Changes`: diff and commits scoped to this PR's range only (`git log` + `git diff` between this branch and its parent)
- `Related Linear Issue`: Linear issue URL from Phase 5 mapping; omit if null

**Do not describe the full stack** — each PR describes its own slice only.

---

## 9. Forbidden operations

**DO NOT use:**

- git checkout (any branch switching)
- git reset / rebase / stash workflows
- gt restack / gt sync / gt modify
- gt c --onto main or any main-based reconstruction
- bun run quality:fix after Graphite stack commits exist
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

## 11. Output format (plan phase only)

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

After plan, show pipeline summary:

```
Pipeline: quality fix → stack (N) → hard quality gate → submit as ready PRs → link Linear → generate descriptions
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
