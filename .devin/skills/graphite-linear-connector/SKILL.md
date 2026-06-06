---
name: graphite-linear-connector
description: >
  Connects Graphite PR stacks to Linear issues using deterministic semantic
  matching, confidence scoring, and safe mutation workflows.

  Links PRs to Linear issues bidirectionally:
  - GitHub-side: adds Linear issue URL to GitHub PR description (always works)
  - Linear-side: adds PR URL to Linear issue's links field (if Linear MCP has mutation tools)

  Supports:
    - linking PRs to existing Linear issues
    - creating new issues when confidence is low
    - dry-run previews
    - duplicate prevention
    - idempotent linking
    - pipeline mode (called from stack-planner, fully automatic)
---

# 0. Core Intent

Connect Graphite PRs to the correct Linear issues safely and deterministically using bidirectional linking:

- **GitHub-side (always):** Add Linear issue URL to GitHub PR description via `gh pr edit`
- **Linear-side (optional):** Add PR URL to Linear issue's `links` field via Linear MCP (if mutation tools available)

Primary goals:

- minimize false matches
- prevent duplicate issue creation
- ensure idempotent operations
- provide explainable confidence scoring
- support safe repeated execution
- degrade gracefully when Linear MCP lacks mutation tools (GitHub-side linking always succeeds)

---

# 0.5. Pipeline Mode

This skill has two invocation modes:

## Standalone mode (default)

User invokes directly: `"connect to linear"`, `"create linear issue"`, etc.
Full flow: PR selection → matching → confirmation gates → mutation → summary.
See section 1 (Input Parsing) for standalone commands.

## Pipeline mode

Invoked by the **stack-planner** skill after `gt submit --draft`.

**Invocation contract:**

```
graphite-linear-connector --pipeline --prs <PR-number-or-url> [<PR-number-or-url> ...]
```

**Behavioral differences from standalone:**

| Behavior                       | Standalone | Pipeline |
| ------------------------------ | ---------- | -------- |
| PR selection UI                | Yes        | Skipped  |
| Confirmation gate (any reason) | Yes        | Skipped  |
| Dry-run mode                   | Optional   | Never    |
| Matching/scoring logic         | Full       | Full     |
| Duplicate prevention           | Yes        | Yes      |
| Idempotency checks             | Yes        | Yes      |

**In pipeline mode, everything runs fully automatically. No stops.**

**Output contract:**

After completing all linking, emit a structured PR → issue mapping for the stack-planner Phase 5 (description generation):

```
PIPELINE_RESULT:
PR #<number>: <Linear-issue-id> | <Linear-issue-url> | <Linear-issue-description-first-paragraph>
PR #<number>: NO_MATCH
...
```

- `<Linear-issue-id>` — Linear issue identifier (e.g., CHR-123)
- `<Linear-issue-url>` — Full URL to the Linear issue
- `<Linear-issue-description-first-paragraph>` — used by stack-planner as "Why" source; keep it as-is (stack-planner summarizes to ≤2 sentences)
- `NO_MATCH` — stack-planner omits the Linear issue link and "Why" section for that PR

---

# 0.6. Linking Strategy

The skill uses **bidirectional linking** to connect PRs and Linear issues:

## GitHub-side linking (always succeeds)

- **What:** Add Linear issue URL to GitHub PR description
- **How:** Via `gh pr edit` command (GitHub CLI)
- **When:** Always, regardless of Linear MCP capabilities
- **Format:** `**Related Linear Issue:** <Linear-issue-url>` at the top of PR description
- **Reliability:** High - uses GitHub CLI which is always available

## Linear-side linking (best effort)

- **What:** Add PR URL to Linear issue's `links` field
- **How:** Via Linear MCP mutation tools (if available)
- **When:** Only if Linear MCP server has mutation tools (e.g., `update_issue`, `save_issue`)
- **Format:** Linear issue's links array with PR URL and title
- **Reliability:** Variable - depends on Linear MCP server configuration
- **Fallback:** Gracefully degrades if mutation tools unavailable

## Why both?

- **GitHub-side:** Ensures developers can always find the Linear issue from the PR
- **Linear-side:** Ensures Linear users can navigate to the PR from the issue
- **Redundancy:** Provides navigation in both directions for better UX
- **Resilience:** GitHub-side linking is the primary reliable path; Linear-side is enhancement

## Checking Linear MCP capabilities

Before attempting Linear-side linking:

1. Call `mcp_list_tools` for the Linear server
2. Check for mutation tools: `update_issue`, `save_issue`, or similar
3. If mutation tools available → attempt Linear-side linking
4. If mutation tools unavailable → skip Linear-side linking, log warning, proceed with GitHub-side only

Example check:

```bash
mcp_list_tools --server-name linear
# Look for tools with destructiveHint: false (safe mutations)
```

---

# 1. Input Parsing

Supported commands:

| Command                    | Meaning                                     |
| -------------------------- | ------------------------------------------- |
| "connect to linear"        | current PR                                  |
| "connect last 5 to linear" | last 5 PRs                                  |
| "connect today's prs"      | PRs created today                           |
| "create linear issue"      | force new issue flow                        |
| "link to LIN-123"          | explicit issue override                     |
| "--dry-run"                | preview only                                |
| "--team <team>"            | explicit team                               |
| "--yes"                    | skip confirmations for safe operations only |

Defaults:

- PR selection defaults to current PR
- dry-run defaults to false

If ambiguous:

- ask user which PRs to process

---

# 2. PR Data Collection

## Graphite commands

### Stack overview (single command)

```bash
gt log
```

Displays all tracked branches with:

- Branch names
- PR numbers and titles
- PR URLs
- Commit hashes and messages
- Branch relationships (parent/child)
- Timestamps

**Note:** Use `gt log --stack` to show only ancestors and descendants of current branch.

### Changed files

```bash
git diff --name-only origin/main...HEAD
```

Extract semantic module signals before detailed analysis.

Processing steps:

1. Group files by:
   - top-level directories
   - feature modules
   - page/component names

2. Count occurrence frequency

3. Generate representative modules:

Example:

```text
src/auth/session/*
src/auth/routes/*
src/profile/*
src/forms/*
```

instead of:

```text
src/auth/session/cache.ts
src/auth/session/utils.ts
src/auth/session/middleware.ts
```

4. Analyze representative modules first

Only if additional detail is needed:

- analyze up to 30 representative files

Use representative modules as signals for:

- semantic matching
- grouping detection
- confidence scoring

### Extracted PR Signals

For each PR collect:

| Signal                            | Weight |
| --------------------------------- | ------ |
| Explicit issue ID in title/branch | 1.0    |
| PR title                          | 0.45   |
| Branch slug                       | 0.25   |
| Commit summaries                  | 0.15   |
| Changed paths/modules             | 0.15   |

### Normalize:

- kebab/snake/camel case
- common engineering abbreviations
- tense/plural variations

---

# 2.5. PR Grouping Strategy

Before searching for Linear issues, determine how to group the PRs based on their semantic relationship.

## Three Grouping Cases

### Case 1: Distinct Features/Bug Fixes

**When to use:** PRs contain clearly different features, bug fixes, or unrelated changes.

**Detection signals:**

- Different domain modules (e.g., auth, payments, landing)
- Different feature nouns (e.g., "email verification", "cache optimization", "mobile padding")
- Different commit patterns (e.g., fix vs feat vs refactor)
- Minimal file overlap between PRs

**Action:** Create separate Linear issues for each PR.

**Example:**

- PR #1: fix(auth): improve mobile responsiveness
- PR #2: feat(landing): tighten padding across sections
- PR #3: refactor(utils): extract authorization module
  → 3 separate Linear issues

---

### Case 2: Same Feature (Stacked Implementation)

**When to use:** Multiple PRs implement different parts of a single cohesive feature.

**Detection signals:**

- Shared feature noun across all PRs (e.g., "email change verification")
- Sequential dependencies (stacked PRs)
- Complementary commit messages (schema → backend → route)
- High file overlap or logical progression
- All PRs reference same ADR or spec document

**Action:** Create one Linear issue with all PRs as sections.

**Example:**

- PR #1: feat(profiles): Add email change verification fields to schema
- PR #2: feat(profile): Add email change verification flow with rate limiting
- PR #3: feat(profile): Add email change verification route
  → 1 Linear issue with 3 sections

---

### Case 3: Wide Refactor with Sub-Issues

**When to use:** A wide refactor that spans many pages/components, where each page/component is a distinct unit of work.

**Detection signals:**

- Same pattern applied across many files (e.g., "migrate to TanStack Form")
- High number of changed files (>20)
- Different page/component names in PR titles
- Shared refactor verb (migrate, refactor, upgrade)
- Each PR touches a different domain/page

**Action:** Create one parent Linear issue + sub-issues for each page/component.

**Example:**

- Parent issue: "Migrate all forms to TanStack Form"
  - Sub-issue: "Migrate login form to TanStack Form"
  - Sub-issue: "Migrate signup form to TanStack Form"
  - Sub-issue: "Migrate enrolment form to TanStack Form"
  - Sub-issue: "Migrate profile form to TanStack Form"

**Implementation:**

1. Create parent issue with overall refactor context
2. Create sub-issues for each page/component
3. Link all sub-issues to parent issue using Linear's `parentId` field
4. Return PR → sub-issue mappings for stack-planner to add to GitHub PR descriptions
5. Return parent issue URL for stack-planner to add to all GitHub PR descriptions

---

## Grouping Detection Algorithm

Compute a grouping score using weighted evidence.

### Signals

| Signal                     | Weight |
| -------------------------- | -----: |
| Shared domain/module names |   0.30 |
| Graphite stack dependency  |   0.30 |
| File overlap               |   0.20 |
| Feature noun similarity    |   0.20 |

Definitions:

- Shared domain/module:
  auth, billing, profile, forms, etc.
- Graphite stack dependency:
  parent-child relationships or same stack ancestry
- File overlap:
  overlap between changed modules/directories
- Feature noun similarity:
  shared feature terms extracted from titles/branches

Calculation:

```text
group_score =
(shared_domain × .30) +
(stack_dependency × .30) +
(file_overlap × .20) +
(noun_similarity × .20)
```

Decision:

- > 80 → Case 2 (Same Feature)
- 50–80 → ambiguous → ask user
- <50 → Case 1 (Distinct)

Override:

If:

- changed files >30
- PR count >3
- shared refactor verbs detected:
  migrate, refactor, upgrade

Then evaluate for Case 3.

---

# 3. Linear Candidate Retrieval

NEVER fetch all active issues.

Use staged retrieval.

## Phase 1: Exact ID detection

Detect:

- LIN-123
- ENG-456
- etc.

If found:

- fetch exact issue
- skip semantic search

## Phase 2: Keyword candidate search

Generate:

- normalized nouns
- module names
- service names
- feature terms

Example:

`auth middleware latency session validation`

Query Linear search API using:

- title keywords
- description keywords
- active states only
- recent activity boost

### Candidate limits

Hard limits:

- max 20 candidate issues
- max 3 search queries per PR
- dedupe repeated candidates

### Allowed workflow categories

Do NOT hardcode state names.

Allowed categories:

- unstarted
- started
- backlog

Exclude:

- completed
- canceled
- archived

---

# 4. Semantic Matching Engine

## Scoring model

### Signals

| Signal                     | Weight |
| -------------------------- | ------ |
| Explicit issue ID match    | 1.0    |
| Exact title phrase overlap | 0.30   |
| Semantic title similarity  | 0.25   |
| Branch slug similarity     | 0.15   |
| Module/path overlap        | 0.15   |
| Commit summary similarity  | 0.10   |
| Recent activity boost      | 0.05   |

### Normalization Rules

Normalize:

- auth → authentication
- perf → performance
- db → database
- ci → continuous integration
- api/apis → api

Strip:

- stop words
- timestamps
- branch prefixes
- ticket boilerplate

### Confidence penalties

Reduce confidence for:

- stale issues (>60d inactive)
- cross-team mismatches
- overly generic titles
- multiple equally strong matches

### Confidence explanation

Always provide rationale.

Example:

```
92% confidence:
- exact phrase: "session middleware"
- shared module: auth-service
- commit mentions latency optimization
```

---

# 5. Threshold Logic

| Confidence | Action                        |
| ---------- | ----------------------------- |
| 95–100     | strong auto-match suggestion  |
| 80–94      | ask confirmation              |
| 50–79      | ambiguous candidate selection |
| <50        | prefer new issue flow         |

### Important safety rule (standalone mode only)

NEVER auto-create issues silently in standalone mode.

Even low-confidence flows require confirmation unless:

- user passed --yes
- AND
- operation is not destructive

**In pipeline mode, all thresholds are acted on automatically with no confirmation. See section 0.5.**

---

# 6. Duplicate Prevention

Before creating issue:

- Perform final exact-title search
- Check recent issues created by current user
- Check existing Graphite resource links
- Compare against issues created in last 24h

If likely duplicate:

- surface warning
- require explicit confirmation (standalone) / skip silently and use existing (pipeline)

---

# 7. Idempotency

Before linking:

Check if PR URL is already in Linear issue's `links` field using Linear MCP:

```bash
mcp1_get_issue <issue-id>
```

If already linked:

- no-op
- report existing association

### Idempotent guarantees

Repeated runs must:

- avoid duplicate issue creation
- avoid duplicate PR URL entries within a Linear issue
- avoid creating the same PR → issue association more than once

Allow:

- multiple PR URLs on the same issue
- multiple Graphite stacks contributing to one issue
- multiple PRs within a stack linking to one issue

---

# 8. Safe Mutation Workflow

### Mutation sequence

1. Collect data
2. Determine PR grouping case (section 2.5)
3. Resolve candidates
4. Score matches
5. Present plan
6. Confirm actions (standalone only — skipped in pipeline mode)
7. Check Linear MCP capabilities (section 0.6)
8. Execute mutations (case-specific)
   - GitHub-side linking: always via `gh pr edit`
   - Linear-side linking: attempt if mutation tools available
9. Verify GitHub-side linking succeeded
10. Verify Linear-side linking (if attempted)
11. Emit summary (+ PIPELINE_RESULT block if in pipeline mode)

### Case-specific mutation workflows

#### Case 1: Distinct Features/Bug Fixes

For each PR independently:

- Search for existing Linear issues
- Score matches
- Create or link to issue
  - When creating new issues: apply the workspace's recommended template (only 1 named "recommended")
- Attempt Linear-side linking: add PR URL to issue's `links` field using Linear MCP (if mutation tools available)
- Return PR → Linear issue mapping for stack-planner to add to GitHub PR description (always succeeds)

#### Case 2: Same Feature (Stacked Implementation)

- Search for existing Linear issues using combined signals
- Score matches against all PRs
- Create one issue with all PRs as sections
  - When creating new issues: apply the workspace's recommended template (only 1 named "recommended")
- Attempt Linear-side linking: add all PR URLs to issue's `links` field using Linear MCP (if mutation tools available)
- Return PR → Linear issue mapping (all PRs map to same issue) for stack-planner to add to GitHub PR descriptions (always succeeds)

#### Case 3: Wide Refactor with Sub-Issues

1. Create parent issue with overall refactor context
   - When creating new issues: apply the workspace's recommended template (only 1 named "recommended")
2. For each PR:
   - Create sub-issue with page/component-specific details
     - When creating new issues: apply the workspace's recommended template (only 1 named "recommended")
   - Set `parentId` to parent issue
   - Attempt Linear-side linking: add PR URL to sub-issue's `links` field using Linear MCP (if mutation tools available)
3. Return PR → sub-issue mappings for stack-planner to add to GitHub PR descriptions (always succeeds)
4. Return parent issue URL for stack-planner to add to all GitHub PR descriptions

### Verification step

After issue creation:

- verify issue retrievable
- verify correct team/state

After GitHub-side linking:

- verify PR description contains Linear issue URL
- verify format matches template: `**Related Linear Issue:** <url>`

After Linear-side linking (if attempted):

- verify Linear issue's `links` array contains PR URL
- if verification fails, log warning but continue (non-critical)

### Linear-side linking implementation

When Linear MCP has mutation tools:

1. Use `mcp_call_tool` with Linear server
2. Call appropriate mutation tool (e.g., `update_issue`, `save_issue`)
3. Add PR URL to issue's `links` array with format:
   ```json
   {
     "url": "https://github.com/Hessuew/dina/pull/123",
     "title": "PR #123: feat(enrollments): add special case flag"
   }
   ```
4. Handle errors gracefully:
   - If tool not found → log warning, skip Linear-side linking
   - If permission denied → log warning, skip Linear-side linking
   - If rate limited → log warning, skip Linear-side linking
   - If network error → log warning, skip Linear-side linking

---

# 9. Dry Run Mode

Supported in standalone mode only:

```bash
connect to linear --dry-run
```

Dry-run:

- performs all matching/scoring
- shows proposed actions
- performs zero mutations

### Dry-run output example

```
PR: feat/auth-session-cache

Best candidate:
- ENG-142: Improve session validation latency

Confidence: 91%

Reasons:
- exact phrase overlap
- shared auth-service module
- commit references latency optimization

Planned actions:
- create new issue ENG-143: Add session cache to auth service
- GitHub-side: add ENG-143 URL to PR description (always)
- Linear-side: add PR URL to ENG-143 links field (if Linear MCP has mutation tools)
- return PR → ENG-143 mapping for GitHub PR description

Dry-run enabled:
- no changes executed
```

---

# 10. Partial Failure Recovery

### Failure classes

| Failure                      | Recovery                  |
| ---------------------------- | ------------------------- |
| Linear issue creation failed | abort linking             |
| Linear link addition failed  | show recovery command     |
| Verification failed          | mark operation incomplete |
| Candidate search timeout     | retry once                |

### Recovery output example

```
Issue created successfully: ENG-532
GitHub PR description updated with Linear link

Linear-side linking failed (Linear MCP missing mutation tools).

Recovery command (optional):
Manually add PR URL to Linear issue's links field:
https://linear.app/christ-dina/issue/ENG-532 → Add link to PR #123
```

---

# 11. Observability

Emit structured operation logs:

| Field      | Example         |
| ---------- | --------------- |
| pr         | feat/auth-cache |
| candidate  | ENG-142         |
| confidence | 91%             |
| action     | linked          |
| verified   | true            |

---

# 12. Output Summary Format

## Standalone mode

```
Connected: 3 PRs

PR #1 → ENG-142 (linked existing, 91%)
PR #2 → ENG-201 (created new)
PR #3 → ENG-142 (linked existing, 88%)
```

## Pipeline mode

Emit the standard summary followed by the PIPELINE_RESULT block:

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

### No Linear issues exist

- skip candidate search
- go directly to new issue creation flow

### All candidates stale

- surface staleness warning
- treat as <50% confidence

### PR already has resource link

- check if linked issue still active
- if active: confirm before re-linking
- if closed: proceed with new matching

### Network timeout

- retry once
- if second attempt fails: mark as failed, continue to next PR

---

# 14. Example Outputs

### New issue created

```
PR:
feat/email-verification-schema

New issue created:
ENG-201 — Add email change verification schema

Team:
Engineering Platform

Verification:
Issue ENG-201 confirmed retrievable
PR URL in ENG-201 links confirmed
```

### Wide refactor (Case 3)

```
Wide refactor detected: "Migrate forms to TanStack Form"

Parent issue created:
ENG-600 — Migrate all forms to TanStack Form

Sub-issues:
ENG-601 — Migrate login form (PR #183)
ENG-602 — Migrate signup form (PR #184)
ENG-603 — Migrate enrolment form (PR #185)
ENG-604 — Migrate profile form (PR #186)
ENG-605 — Migrate settings form (PR #187)

Team:
Engineering Platform

Verification:
- Parent issue creation confirmed
- All 5 sub-issues created with parentId=ENG-600
- All 5 PR URLs in respective sub-issues links fields
- All 5 PR URLs in parent issue links field
```

### Existing issue linked (legacy format)

```
PR:
feat/auth-session-cache

Best match:
ENG-142 — Improve session validation latency

Confidence:
91%

Reasons:
- exact title overlap
- shared auth-service module
- matching commit terminology

Action:
Linked existing issue via Linear links

Verification:
PR URL in Linear links confirmed
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
