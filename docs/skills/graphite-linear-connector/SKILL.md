---
name: graphite-linear-connector
description: >
  Connects Graphite PR stacks to Linear issues using deterministic semantic
  matching, confidence scoring, and safe mutation workflows.

  Links PRs to Linear issues bidirectionally:
  - GitHub-side: adds Linear issue URL to GitHub PR description (via gh pr edit)
  - Linear-side: adds PR URL to the Linear issue's links field (via save_issue)

  Supports:
    - linking PRs to existing Linear issues
    - creating new issues when confidence is low
    - dry-run previews
    - duplicate prevention
    - idempotent linking
    - pipeline mode (called from stack-planner, fully automatic)
---

# 1. Core Intent

Connect Graphite PRs to the correct Linear issues safely and deterministically using bidirectional linking:

- **GitHub-side:** Add the Linear issue URL to the GitHub PR description via `gh pr edit`.
- **Linear-side:** Add the PR URL to the Linear issue's `links` field via `mcp__plugin_linear_linear__save_issue`.

Goals: minimize false matches, prevent duplicate issue creation, keep operations idempotent, and provide explainable confidence scoring.

## Linking strategy

Both directions always run; both are reliable in this environment:

- **GitHub-side** (`gh pr edit`) — writes `**Related Linear Issue:** <url>` at the top of the PR description. Lets developers reach the issue from the PR.
- **Linear-side** (`save_issue` with `links: [{url, title}]`) — the `links` field is **append-only**, so re-linking the same PR is a no-op. Lets Linear users reach the PR from the issue.

There is no capability detection: `save_issue` is always available. Only handle _real_ runtime failures (network, rate-limit, permission) — see section 10.

## Linear MCP tools used

| Purpose                 | Tool                                     |
| ----------------------- | ---------------------------------------- |
| Fetch issue + links     | `mcp__plugin_linear_linear__get_issue`   |
| Search candidate issues | `mcp__plugin_linear_linear__list_issues` |
| Create / update / link  | `mcp__plugin_linear_linear__save_issue`  |

`save_issue` creates a new issue when no `id` is passed, and updates an existing one when `id` is present. The same call adds `links` (append-only) and accepts `parentId` for sub-issues.

---

# 2. Invocation Modes

## Standalone mode (default)

User invokes directly: `"connect to linear"`, `"create linear issue"`, etc.
Full flow: PR selection → matching → confirmation gates → mutation → summary.
See section 3 (Input Parsing).

## Pipeline mode

Invoked by the **stack-planner** skill after `gt submit --draft`.

**Invocation contract:**

```
graphite-linear-connector --pipeline --prs <PR-number-or-url> [<PR-number-or-url> ...]
```

**Behavioral differences from standalone:**

| Behavior             | Standalone | Pipeline |
| -------------------- | ---------- | -------- |
| PR selection UI      | Yes        | Skipped  |
| Confirmation gates   | Yes        | Skipped  |
| Dry-run mode         | Optional   | Never    |
| Matching / scoring   | Full       | Full     |
| Duplicate prevention | Yes        | Yes      |
| Idempotency checks   | Yes        | Yes      |

**Pipeline mode runs fully automatically and never pauses.** Every threshold (section 7) is acted on automatically; `<50%` confidence auto-creates a new issue, or emits `NO_MATCH` when there is nothing to derive an issue from.

**Output contract** — after linking all PRs, emit the PR → issue mapping for stack-planner Phase 5 (description generation):

```
PIPELINE_RESULT:
PR #<number>: <Linear-issue-id> | <Linear-issue-url> | <Linear-issue-description-first-paragraph>
PR #<number>: NO_MATCH
...
```

- `<Linear-issue-id>` — e.g. `CHR-123`.
- `<Linear-issue-url>` — full URL to the issue.
- `<Linear-issue-description-first-paragraph>` — stack-planner's "Why" source; pass it as-is (stack-planner summarizes to ≤2 sentences).
- `NO_MATCH` — stack-planner omits the Linear link and "Why" section for that PR.

---

# 3. Input Parsing

| Command                    | Meaning                                     |
| -------------------------- | ------------------------------------------- |
| "connect to linear"        | current PR                                  |
| "connect last 5 to linear" | last 5 PRs                                  |
| "connect today's prs"      | PRs created today                           |
| "create linear issue"      | force new issue flow                        |
| "link to LIN-123"          | explicit issue override                     |
| "--dry-run"                | preview only (standalone)                   |
| "--team <team>"            | explicit team                               |
| "--yes"                    | skip confirmations for safe operations only |

Defaults: PR selection = current PR; dry-run = false. If the PR selection is ambiguous, ask which PRs to process.

---

# 4. PR Data Collection

## Graphite / git commands

```bash
gt log                                    # stack overview: branches, PR numbers/titles/URLs, commits, parent/child
gt log --stack                            # only ancestors/descendants of current branch
git diff --name-only origin/main...HEAD   # changed files
```

## Module signal extraction

Group changed files into representative modules before detailed analysis:

```text
src/auth/session/*      (not src/auth/session/cache.ts, utils.ts, middleware.ts)
src/auth/routes/*
src/profile/*
```

Analyze representative modules first; drill into individual files (max 30) only if more detail is needed. Use modules as signals for matching, grouping, and scoring.

## Extracted PR signals

| Signal                            | Weight |
| --------------------------------- | ------ |
| Explicit issue ID in title/branch | 1.0    |
| PR title                          | 0.45   |
| Branch slug                       | 0.25   |
| Commit summaries                  | 0.15   |
| Changed paths/modules             | 0.15   |

Normalize: kebab/snake/camel case, common engineering abbreviations, tense/plural variations.

---

# 5. PR Grouping Strategy

Before searching Linear, decide how to group the PRs. **This is the single source of truth for the three cases**; section 9 references it for mutations.

## Case 1 — Distinct features / bug fixes

PRs are clearly different work. Signals: different domain modules, different feature nouns, different commit types (fix/feat/refactor), minimal file overlap.
**Action:** one Linear issue per PR.
Example: `fix(auth)…`, `feat(landing)…`, `refactor(utils)…` → 3 issues.

## Case 2 — Same feature (stacked implementation)

Multiple PRs implement one cohesive feature. Signals: shared feature noun, sequential stack dependencies, complementary commits (schema → backend → route), high file overlap, same ADR/spec.
**Action:** one Linear issue; all PRs linked to it.
Example: schema → flow → route for "email change verification" → 1 issue.

## Case 3 — Wide refactor with sub-issues

One pattern applied across many pages/components, each a distinct unit. Signals: same refactor verb (migrate/refactor/upgrade), >20 changed files, different page/component names per PR.
**Action:** one parent issue + one sub-issue per page/component (`parentId`).
Example: parent "Migrate all forms to TanStack Form" + sub-issues per form.

## Grouping detection algorithm

| Signal                     | Weight |
| -------------------------- | -----: |
| Shared domain/module names |   0.30 |
| Graphite stack dependency  |   0.30 |
| File overlap               |   0.20 |
| Feature noun similarity    |   0.20 |

```text
group_score = shared_domain×.30 + stack_dependency×.30 + file_overlap×.20 + noun_similarity×.20
```

- `>80` → Case 2 (same feature)
- `50–80` → ambiguous → ask user (standalone) / default to Case 1 (pipeline)
- `<50` → Case 1 (distinct)

**Case 3 override:** if changed files >30 **and** PR count >3 **and** a shared refactor verb (migrate/refactor/upgrade) is present, evaluate for Case 3.

---

# 6. Linear Candidate Retrieval

NEVER fetch all active issues. Use staged retrieval via `mcp__plugin_linear_linear__list_issues`.

## Phase 1 — Exact ID detection

Detect an explicit ID (`LIN-123`, `ENG-456`, `CHR-72`) in title/branch. If found, fetch it directly with `get_issue` and skip semantic search.

## Phase 2 — Keyword candidate search

Build a query from normalized nouns, module names, service names, and feature terms, e.g. `auth middleware latency session validation`. Call `list_issues` with:

- `query` — title/description keywords
- `state` — active categories only (see below)
- `team` — when known
- `createdAt` / `orderBy: updatedAt` — recent-activity boost

**Limits:** max 20 candidates, max 3 queries per PR, dedupe repeats.

**State categories** (do not hardcode state names): include `unstarted`, `started`, `backlog`; exclude `completed`, `canceled`, `archived`.

---

# 7. Semantic Matching & Thresholds

## Scoring signals

| Signal                     | Weight |
| -------------------------- | ------ |
| Explicit issue ID match    | 1.0    |
| Exact title phrase overlap | 0.30   |
| Semantic title similarity  | 0.25   |
| Branch slug similarity     | 0.15   |
| Module/path overlap        | 0.15   |
| Commit summary similarity  | 0.10   |
| Recent activity boost      | 0.05   |

**Normalize:** `auth→authentication`, `perf→performance`, `db→database`, `ci→continuous integration`, `api/apis→api`. Strip stop words, timestamps, branch prefixes, ticket boilerplate.

**Penalties:** stale issues (>60d inactive), cross-team mismatch, overly generic titles, multiple equally strong matches.

**Always explain confidence**, e.g.:

```
92% confidence:
- exact phrase: "session middleware"
- shared module: auth-service
- commit mentions latency optimization
```

## Threshold actions

| Confidence | Action                        |
| ---------- | ----------------------------- |
| 95–100     | strong auto-match suggestion  |
| 80–94      | ask confirmation              |
| 50–79      | ambiguous candidate selection |
| <50        | new-issue flow                |

- **Standalone:** never auto-create silently. Even low-confidence flows require confirmation unless the user passed `--yes` and the operation is non-destructive.
- **Pipeline:** all tiers act automatically with no confirmation; `<50` auto-creates (see section 2).

---

# 8. Duplicate Prevention & Idempotency

## Before creating an issue

- Final exact-title search via `list_issues`.
- Check issues created by the current user in the last 24h.
- Check existing Graphite resource links on the PR.

If a duplicate is likely: surface a warning and require confirmation (standalone), or skip creation and reuse the existing issue (pipeline).

## Before linking

Call `mcp__plugin_linear_linear__get_issue { id }` and check whether the PR URL is already in the issue's `links`. If present, no-op and report the existing association. (The `links` field is append-only, so this is a belt-and-suspenders check.)

**Idempotent guarantees across repeated runs:** no duplicate issue creation, no duplicate PR-URL entries in an issue, no duplicate PR→issue association. **Allowed:** multiple PR URLs on one issue, multiple stacks contributing to one issue, multiple PRs in a stack linking to one issue.

---

# 9. Safe Mutation Workflow

## Sequence

1. Collect data (section 4).
2. Determine grouping case (section 5).
3. Resolve candidates (section 6) and score (section 7).
4. Present plan; confirm (standalone only — skipped in pipeline).
5. Execute mutations (case-specific, below).
6. Verify (below).
7. Emit summary (+ `PIPELINE_RESULT` block if pipeline).

## Issue creation parameters

Apply these to **every** new issue (parent and sub-issues) via `save_issue`:

- **Description:** fill the template in `.devin/linear-issue-template.md` (Goal / Context / Requirements / Impact / Constraints), populated from PR title, commits, changed modules.
- **Priority** (auto-derived from commit type):

  | Commit type | Priority | Value |
  | ----------- | -------- | ----- |
  | fix         | Urgent   | 1     |
  | feat        | High     | 2     |
  | refactor    | Medium   | 3     |
  | chore       | Low      | 4     |
  | (unclear)   | Medium   | 3     |

- **Assignee:** `Juhani Juusola`
- **Status (`state`):** `In Progress`

**`save_issue` call shape:**

```json
{
  "title": "<derived from PR>",
  "description": "<filled .devin/linear-issue-template.md>",
  "team": "<user-specified or detected>",
  "priority": "<1|2|3|4 per table>",
  "assignee": "Juhani Juusola",
  "state": "In Progress",
  "links": [{ "url": "<PR URL>", "title": "<PR title>" }]
}
```

For sub-issues, also pass `"parentId": "<parent issue id>"`. To update/link an existing issue instead of creating one, pass `"id": "<issue id>"` (omit when creating).

## Case-specific mutations (grouping per section 5)

- **Case 1:** for each PR independently — search, score, then link the best match or create a new issue (per Issue-creation-parameters). Add the PR URL to that issue's `links`.
- **Case 2:** search using combined signals; create **one** issue (per Issue-creation-parameters); add **all** PR URLs to its `links`. All PRs map to the same issue.
- **Case 3:** create the parent issue (per Issue-creation-parameters); for each PR create a sub-issue with `parentId` set; add each PR URL to its sub-issue's `links`. Return per-PR sub-issue mappings plus the parent URL.

Every case: GitHub-side link always via `gh pr edit`; Linear-side link via `save_issue` `links`.

## Verification

- New issue: retrievable with correct team/state (`get_issue`).
- GitHub-side: PR description contains `**Related Linear Issue:** <url>`.
- Linear-side: issue's `links` contains the PR URL. On failure, log a warning and continue (non-critical).

---

# 10. Dry Run Mode (standalone only)

```bash
connect to linear --dry-run
```

Performs all matching/scoring, shows proposed actions, makes **zero** mutations.

```
PR: feat/auth-session-cache
Best candidate: ENG-142 — Improve session validation latency (91%)
Reasons: exact phrase overlap; shared auth-service module; commit references latency

Planned actions:
- create ENG-143 "Add session cache to auth service" (feat → High, assignee Juhani, In Progress)
- GitHub-side: add ENG-143 URL to PR description
- Linear-side: add PR URL to ENG-143 links
Dry-run: no changes executed
```

---

# 11. Partial Failure Recovery

| Failure                      | Recovery                          |
| ---------------------------- | --------------------------------- |
| Issue creation failed        | abort linking for that PR         |
| Link addition failed         | log warning, surface recovery cmd |
| Verification failed          | mark operation incomplete         |
| Candidate search timeout     | retry once, then skip PR          |
| Network / rate-limit / perms | log warning, continue to next PR  |

These are real runtime errors only — `save_issue` itself is always present, so "missing tool" is not a case.

---

# 12. Output Summary

## Standalone

```
Connected: 3 PRs
PR #1 → ENG-142 (linked existing, 91%)
PR #2 → ENG-201 (created new)
PR #3 → ENG-142 (linked existing, 88%)
```

## Pipeline

Standard summary, then the `PIPELINE_RESULT` block:

```
Connected: 3 PRs
PR #241 → CHR-72 (linked existing, 94%)
PR #242 → CHR-72 (linked existing, 94%)
PR #243 → NO_MATCH

PIPELINE_RESULT:
PR #241: CHR-72 | https://linear.app/christ-dina/issue/CHR-72/... | ADR 0006 introduces Enrollment Evaluations...
PR #242: CHR-72 | https://linear.app/christ-dina/issue/CHR-72/... | ADR 0006 introduces Enrollment Evaluations...
PR #243: NO_MATCH
```

---

# 13. Edge Cases

- **No Linear issues exist:** skip candidate search, go straight to new-issue flow.
- **All candidates stale:** surface staleness warning, treat as <50% confidence.
- **PR already has a resource link:** if the linked issue is still active, confirm before re-linking (standalone) / reuse it (pipeline); if closed, proceed with new matching.
- **Network timeout:** retry once; if it fails again, mark the PR failed and continue.

---

# 14. Example — Wide refactor (Case 3)

```
Wide refactor detected: "Migrate forms to TanStack Form"

Parent: ENG-600 — Migrate all forms to TanStack Form (refactor → Medium, Juhani, In Progress)
Sub-issues (parentId=ENG-600, same params):
  ENG-601 — Migrate login form    (PR #183)
  ENG-602 — Migrate signup form   (PR #184)
  ENG-603 — Migrate enrolment form (PR #185)

Verification:
- parent + 3 sub-issues created
- each PR URL present in its sub-issue links
```

---

# 15. Performance Constraints

| Constraint                        | Limit |
| --------------------------------- | ----- |
| Max Linear candidates             | 20    |
| Max search queries per PR         | 3     |
| Max commit summaries analyzed     | 10    |
| Max representative files analyzed | 30    |
| Max module groups analyzed        | 10    |
| Candidate search timeout          | 5s    |
