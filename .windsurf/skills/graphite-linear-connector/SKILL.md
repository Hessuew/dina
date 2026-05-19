---
name: graphite-linear-connector
description: >
  Connects Graphite PR stacks to Linear issues using deterministic semantic
  matching, confidence scoring, and safe mutation workflows.

  Uses Graphite MCP to link Linear issues to Graphite branches/stacks on the
  Graphite side

  Supports:
    - linking PRs to existing Linear issues
    - creating new issues when confidence is low
    - dry-run previews
    - duplicate prevention
    - idempotent linking
---

# 0. Core Intent

Connect Graphite PRs to the correct Linear issues safely and deterministically.

Primary goals:

- minimize false matches
- prevent duplicate issue creation
- ensure idempotent operations
- provide explainable confidence scoring
- support safe repeated execution

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
3. Link each PR to its corresponding sub-issue
4. Link all sub-issues to parent issue using Linear's `parentId` field
5. Add PR URLs as attachments to both sub-issue and parent issue

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

### Important safety rule

NEVER auto-create issues silently.

Even low-confidence flows require confirmation unless:

- user passed --yes
- AND
- operation is not destructive

---

# 6. Duplicate Prevention

Before creating issue:

- Perform final exact-title search
- Check recent issues created by current user
- Check existing Graphite resource links
- Compare against issues created in last 24h

If likely duplicate:

- surface warning
- require explicit confirmation

---

# 7. Idempotency

Before linking:

Check if Linear issue is already linked to Graphite branch using Graphite MCP:

```bash
gt branch show --json
```

If already linked:

- no-op
- report existing association

### Idempotent guarantees

Repeated runs must:

- avoid duplicate links
- avoid duplicate issue creation
- avoid duplicate Graphite resource attachments

---

# 8. Safe Mutation Workflow

### Mutation sequence

1. Collect data
2. Determine PR grouping case (section 2.5)
3. Resolve candidates
4. Score matches
5. Present plan
6. Confirm actions
7. Execute mutations (case-specific)
8. Verify mutations succeeded
9. Emit summary

### Case-specific mutation workflows

#### Case 1: Distinct Features/Bug Fixes

For each PR independently:

- Search for existing Linear issues
- Score matches
- Create or link to issue using Graphite MCP
- Use Graphite MCP to attach Linear issue ID to Graphite branch
- Verify linking

#### Case 2: Same Feature (Stacked Implementation)

- Search for existing Linear issues using combined signals
- Score matches against all PRs
- Create one issue with all PRs as sections
- Use Graphite MCP to attach Linear issue ID to each Graphite branch in the stack
- Verify linking

#### Case 3: Wide Refactor with Sub-Issues

1. Create parent issue with overall refactor context
2. For each PR:
   - Create sub-issue with page/component-specific details
   - Set `parentId` to parent issue
   - Use Graphite MCP to attach sub-issue Linear ID to corresponding Graphite branch
3. Verify all linkings

### Verification step

After linking:

Use Graphite MCP to verify Linear issue is attached to Graphite branch:

```bash
gt branch show --json
```

Verify resource exists.

After issue creation:

- verify issue retrievable
- verify correct team/state

---

# 9. Dry Run Mode

Supported:

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

Planned action:
- link PR to ENG-142

Dry-run enabled:
- no changes executed
```

---

# 10. Partial Failure Recovery

### Failure classes

| Failure                                      | Recovery                  |
| -------------------------------------------- | ------------------------- |
| Linear issue creation failed                 | abort linking             |
| Graphite MCP link failed after issue created | show recovery command     |
| Verification failed                          | mark operation incomplete |
| Candidate search timeout                     | retry once                |

### Recovery output example

```
Issue created successfully: ENG-532

Graphite MCP linking failed.

Recovery command:
Use Graphite MCP to attach Linear issue ENG-532 to branch
```

---

# 11. Observability

Emit structured operation logs:

| Field         | Example         |
| ------------- | --------------- |
| operation_id  | glc_8fj29a      |
| pr_branch     | feat/auth-cache |
| matched_issue | ENG-142         |
| confidence    | 91              |
| action        | linked_existing |
| dry_run       | false           |
| duration_ms   | 1420            |

---

# 12. User Interaction Rules

Always show:

- candidate issues
- confidence score
- confidence explanation
- exact planned mutation

Allow:

- explicit issue override
- skipping PRs
- aborting operation
- force create new issue

---

# 13. Forbidden Operations

DO NOT:

- modify PR titles/descriptions
- modify existing Linear issues
- rebase/restack/submit branches
- silently create issues
- silently relink issues
- infer team without confirmation
- mutate closed/completed issues

---

# 14. Optimized Output Format

### Case 1: Distinct Features (Multiple Issues)

```
Grouping: Case 1 (Distinct Features)

PR #1: fix(auth): improve mobile responsiveness
  → Linked to ENG-142 (91% confidence)
  → Verification: Graphite MCP resource link confirmed

PR #2: feat(landing): tighten padding across sections
  → Created new issue ENG-613
  → Team: Platform
  → Verification: Issue creation + Graphite MCP link confirmed

PR #3: refactor(utils): extract authorization module
  → Linked to ENG-28 (87% confidence)
  → Verification: Graphite MCP resource link confirmed
```

### Case 2: Same Feature (Single Issue with Sections)

```
Grouping: Case 2 (Same Feature - Stacked Implementation)

Detected: 3 PRs implementing "email change verification" feature

Result:
No reliable existing match found

Action:
Created new issue CHR-50: Implement custom email change verification flow

Team:
Christ-dina

Linked PRs (via Graphite MCP):
- PR #172: Schema Changes
- PR #173: Backend Flow with Resend
- PR #174: Verification Route

Verification:
- Issue creation confirmed
- All 3 PR branches linked to CHR-50 via Graphite MCP
```

### Case 3: Wide Refactor (Parent + Sub-Issues)

```
Grouping: Case 3 (Wide Refactor with Sub-Issues)

Detected: 5 PRs migrating forms to TanStack Form

Result:
No reliable existing match found

Action:
Created parent issue ENG-600: Migrate all forms to TanStack Form

Created sub-issues:
- ENG-601: Migrate login form to TanStack Form
- ENG-602: Migrate signup form to TanStack Form
- ENG-603: Migrate enrolment form to TanStack Form
- ENG-604: Migrate profile form to TanStack Form
- ENG-605: Migrate forgot password form to TanStack Form

Team:
Platform

Verification:
- Parent issue creation confirmed
- All 5 sub-issues created with parentId=ENG-600
- All 5 PR branches linked to respective sub-issues via Graphite MCP
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
Linked existing issue via Graphite MCP

Verification:
Graphite MCP resource link confirmed
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
