---
name: stack-planner
description: >
  Converts git working directory changes into bounded intent-based Graphite stacks,
  submits them as draft PRs, links them to Linear issues, and generates AI descriptions
  for each PR. Full pipeline runs uninterrupted after a single approval gate.
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

# Graphite Stack Planner — v6.0 (Full pipeline)

## 0. Core intent

Convert:
`git diff` → intent clusters → stacks → submit as drafts → link Linear → generate PR descriptions

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

**One approval gate:** show the plan → user approves → full pipeline runs without further stops.

**Exception:** if graphite-linear-connector (Phase 4) encounters a match confidence <80% on any PR, it pauses for that PR only. See pipeline mode contract in the connector skill.

**If repo state is unclear:**
→ stop and ask user before doing anything

---

## 2. Allowed Graphite execution

**Stack creation (one per cluster, bottom → top):**

```bash
gt c --ai --no-interactive
```

**Submit all stacks as drafts:**

```bash
gt submit --draft
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
4. **Wait for approval — this is the only gate**

---

### Phase 2 — Stack

For each cluster (bottom → top):

1. Stage only the files for this cluster:
   `git add <files-for-this-stack>`
2. Run:
   `gt c --ai --no-interactive`
3. Stop immediately on any failure — do not continue to next cluster

---

### Phase 3 — Submit

After all stacks are created:

```bash
gt submit --draft
```

Run `gt log` after submit to collect the PR numbers and URLs for all submitted PRs.

---

### Phase 4 — Link Linear

Invoke the **graphite-linear-connector** skill in pipeline mode:

- Pass the explicit list of PR numbers/URLs collected in Phase 3
- Pass `--pipeline` flag (fully automatic, no confirmation stops)
- The connector returns a **PR → Linear issue mapping** (may be null per PR if no match)

See the connector skill's Pipeline Mode section for full contract.

---

### Phase 5 — Generate PR descriptions

For each submitted PR, generate a description using the template contract below and write it via:

```bash
gh pr edit <PR-number> --body-file /tmp/pr-<PR-number>.md
```

**Description contract** (matches `.github/PULL_REQUEST_TEMPLATE.md`):

```markdown
**Related Linear Issue:** <Linear-issue-url>
<Include this header only if Phase 4 returned a Linear issue for this PR>

## What

<1-sentence summary derived from the commit title for this PR>

## Why

<≤2-sentence summary of the Linear issue purpose — from the PR→issue mapping returned in Phase 4>
<Omit this section entirely if Phase 4 returned no issue for this PR>

## Changes

<Intent-level bullets describing what behavior changed in this PR's slice only>
<Not file names — what behavior, what the user/system experiences differently>
```

**Sources per PR:**

- `What`: commit title / PR title for this stack slice
- `Why`: Linear issue description (summarize to ≤2 sentences); omit if null
- `Changes`: diff and commits scoped to this PR's range only (`git log` + `git diff` between this branch and its parent)
- `Related Linear Issue`: Linear issue URL from Phase 4 mapping; omit if null

**Do not describe the full stack** — each PR describes its own slice only.

---

## 9. Forbidden operations

**DO NOT use:**

- git checkout (any branch switching)
- git reset / rebase / stash workflows
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
Pipeline: stack (N) → submit as drafts → link Linear → generate descriptions
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
