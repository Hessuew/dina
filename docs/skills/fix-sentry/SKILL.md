---
name: fix-sentry
description: >
  Fetches unresolved Sentry issues into the editor, triages them with stack
  traces and breadcrumbs, proposes a fix, and implements it only after approval.
  Use when user says:
    - "fix sentry"
    - "fix sentry issues"
    - "check sentry"
    - "triage sentry"
    - "sentry errors"
---

# Fix Sentry Issues

## Core Intent

Pull unresolved Sentry issues into the coding session, diagnose the real cause, and fix it in
the codebase — without leaving the editor and without touching anything the user hasn't
approved.

The skill:

- Lists unresolved Sentry issues for the **dina** project, ranked by frequency/recency.
- Fetches full detail (stack trace) for manual root-cause analysis.
- Maps the culprit frame to a repo file/line.
- Presents a diagnosis + fix plan, and implements the fix **only after approval**.
- Marks the Sentry issue resolved automatically once verification (typecheck + scoped tests)
  passes.

## Preferred tool: sentry-axi (not MCP)

**Always prefer `node scripts/sentry-axi.mjs` over the hosted Sentry MCP.**

Reason: AXI CLI is stable, TOON-compact, no OAuth-in-session, no tool-name churn. MCP is
fallback only when axi is broken (missing binary, AUTH that cannot be fixed from `.env`).

Full CLI reference: [`docs/skills/sentry-axi/SKILL.md`](../sentry-axi/SKILL.md).

### Fixed DINA context (do not re-discover)

| Setting  | Value         |
| -------- | ------------- |
| Org      | `cherubim-it` |
| Project  | `dina`        |

Always pass both flags (or export them for the shell session). Do **not** call `orgs` /
`projects` discovery unless the user overrides `--project` or listing fails with a clear
"org/project not found" error.

```sh
export SENTRY_ORG=cherubim-it
export SENTRY_PROJECT=dina
```

`scripts/sentry-axi.mjs` loads `.env` via `dotenv/config` from the repo root. Put
`SENTRY_AXI_AUTH_TOKEN` there (required scopes: `org:read` `event:read` `event:admin`).
Do **not** use `SENTRY_AUTH_TOKEN` (reserved for source-map upload).

## Invocation Modes

| Command                       | Meaning                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `fix sentry`                  | List unresolved issues, pick/triage, propose a fix, implement after approval. |
| `fix sentry --dry-run`        | Fetch + triage + diagnosis only; never edit code or mutate Sentry.            |
| `fix sentry <ISSUE-ID/URL>`   | Go straight to one issue by Sentry short-ID (e.g. `DINA-S`) or URL.           |
| `fix sentry --project <slug>` | Override project (default `dina`).                                            |

Default behavior is safe: no code edit and no Sentry mutation without explicit approval.

---

## Execution Steps

### 0. Auth smoke (once per session)

From repo root:

```sh
node scripts/sentry-axi.mjs --org cherubim-it
```

Expect `top_issues[…]` for the org. If you get `AUTH_REQUIRED` / `AUTH_ERROR`:

1. Confirm `.env` has `SENTRY_AXI_AUTH_TOKEN` (not only `SENTRY_AUTH_TOKEN`).
2. Token needs scopes `org:read` `event:read` `event:admin` — `org:ci` alone is not enough.
3. Stop and ask the user to fix the token. Do not fall through to MCP unless axi is
   unavailable for a non-auth reason and the user asks.

### 1. Resolve context

Defaults are fixed: org `cherubim-it`, project `dina`.

Honor `--project <slug>` when the user passes it. Otherwise always use `dina`.

Optional confirmation (usually skip):

```sh
node scripts/sentry-axi.mjs projects --org cherubim-it
```

### 2. List unresolved issues

Unless a specific issue ID/URL was passed:

```sh
node scripts/sentry-axi.mjs issues list \
  --org cherubim-it \
  --project dina \
  --status unresolved \
  --limit 20
```

Present a short table for the user to pick from:

```text
Unresolved Sentry issues — dina:
- DINA-S  Error: Not authorized to editLesson…   2 events   2d ago
- DINA-X  Error: Server function info not found… 10 events   2d ago
```

Include short-ID, title, event count, last-seen. Let the user pick one (or more, one at a
time). **Do not begin fixing until an issue is selected.**

Quick dashboard (top 5 only):

```sh
node scripts/sentry-axi.mjs --org cherubim-it --project dina
```

**Do not** pass the short-ID as a list `--query` — use `issues view <id>` for direct lookup.

### 3. Triage the chosen issue

```sh
# Summary + stack preview (~1500 chars)
node scripts/sentry-axi.mjs issues view DINA-S --org cherubim-it

# Full stack when preview is truncated or frames look minified
node scripts/sentry-axi.mjs issues view DINA-S --org cherubim-it --full
```

Map the top in-app culprit frame to the actual repo file and line. Read that code.
Prefer frames inside this repo's `src/**` over framework/vendor frames.

**If the stack shows only `at (anonymous) (?)` / minified frames**, source maps may not be
uploaded. Note that. Still diagnose from:

- Error message + tags on the issue
- Culprit string / transaction
- Codebase search for the error pattern or server-fn name

(Breadcrumbs: axi may not expose them yet; if needed for a tough case, fall back to MCP
`get_sentry_resource` breadcrumbs — see Fallback section.)

### 4. Present Diagnosis + Fix Plan

Show, before editing anything:

- **Root cause** — what actually throws, and why (stack + code).
- **Source map status** — note if the trace is minified/unresolvable.
- **Fix status** — is the fix already present in the local codebase? (git log, read
  affected files, compare Sentry last-seen vs fix commit date.)
- **Files to change** (or already changed) — repo-relative paths and the intended change.
- **Approach** — the minimal fix, and any test to add that reproduces the error.

**Stop here on `--dry-run`.** Otherwise:

- **If fix is already in the codebase**: skip to Step 6 (verify) without approval — no code
  change is being made, only verification + Sentry resolution.
- **If fix is needed**: wait for user approval, then proceed to Step 5.

### 4a. Fix Already in Codebase — fast path

When triage reveals the fix is already committed (the Sentry event pre-dates a commit that
addresses the root cause):

1. State clearly: "Fix already present in commit `<hash>` (`<short message>`). No code change
   needed. Running verification before resolving in Sentry."
2. Skip to Step 6 directly.
3. After verification passes, auto-resolve in Sentry (Step 7) without waiting for approval.

### 5. Implement the Fix (after approval)

Follow repo rules exactly:

- Surgical diff — change only what the fix requires (`CLAUDE.md` Core Priority rules).
- `docs/rules/complexity.md` — new/changed function bodies ≤ 60 lines; extract sub-units.
- `docs/rules/db-types.md` — derive DB enum types from Drizzle, never re-declare.
- Domain-service layering — business logic in `src/domain/`; server fns stay thin adapters.
- Add or adjust a test that reproduces the error where practical.

### 6. Verify

- Typecheck the touched area.
- Run the **scoped** test(s) for the changed code — NOT the full `quality:gate`
  (project memory: never run the full gate; use scoped vitest + typecheck).
- Report what was checked and the result.

### 7. Resolve in Sentry — auto after verification passes

Once verification in Step 6 reports clean (no typecheck errors, no failing scoped tests):

```sh
node scripts/sentry-axi.mjs issues resolve DINA-S --org cherubim-it
```

Idempotent: already-resolved returns no-op exit 0.

Mention root cause + files changed in your user-facing summary (axi resolve has no comment
field; put the narrative in the agent reply / PR, not in a fake CLI flag).

If verification reveals errors, keep the issue unresolved, report the failure, and continue
debugging before resolving.

---

## Canonical command cheatsheet

```sh
# Auth smoke + top issues
node scripts/sentry-axi.mjs --org cherubim-it --project dina

# Full unresolved list
node scripts/sentry-axi.mjs issues list \
  --org cherubim-it --project dina --status unresolved --limit 20

# Detail
node scripts/sentry-axi.mjs issues view <ID> --org cherubim-it
node scripts/sentry-axi.mjs issues view <ID> --org cherubim-it --full

# After fix + verify
node scripts/sentry-axi.mjs issues resolve <ID> --org cherubim-it

# Releases (optional context)
node scripts/sentry-axi.mjs releases list --org cherubim-it --project dina
```

Run from the **repo root** so `dotenv/config` picks up `.env`.

---

## Fallback: Sentry MCP (only if axi cannot run)

Use the hosted Sentry MCP only when `scripts/sentry-axi.mjs` is unavailable or the user
explicitly asks for MCP.

- **Windsurf / Devin**: `mcp_call_tool` with `server_name: 'sentry'`. **Never batch** multiple
  MCP calls in one turn; each needs its own call with `server_name`.
- **Claude Code**: native `mcp__sentry__*` tools.
- Discover tools with `search_sentry_tools` if a name is missing — never guess.
- Verified names (as of 2026-07): `search_issues`, `get_sentry_resource`, `update_issue`,
  `find_organizations`, `find_projects`, `search_events`.
- `get_issue_details` / `find_issues` do **not** exist.
- Breadcrumbs: `get_sentry_resource` with `organizationSlug` + `resourceType: 'breadcrumbs'` +
  `resourceId` (no `url` in the same call). Issue detail by URL: pass **only** `url`.

If MCP shows "Needs authentication", stop and ask the user to complete OAuth — cannot auth
headlessly.

---

## Safety Contract

- Read-only fetch/triage first; no code edits or Sentry mutations without approval.
- `--dry-run` never mutates code or Sentry.
- Surgical diffs only — no unrelated cleanup or refactors.
- Auto-resolve only after verification passes (typecheck + scoped tests clean); never resolve
  when verification fails or was skipped.
- If fix is already in the codebase, skip Step 5 and go straight to Step 6 — no approval needed
  since no code is being changed.
- Prefer sentry-axi; do not open MCP first.
- Default org/project are fixed for this repo (`cherubim-it` / `dina`) — do not guess other
  projects for this codebase.
- If the culprit frame can't be mapped to repo code with confidence, report that and ask —
  do not guess a fix location.

---

## Self-improvement

After using this skill, follow `docs/improvements/IMPROVEMENTS_PROTOCOL.md`: log any friction
(auth, missing axi features, wrong defaults, workflow gaps) to
`docs/improvements/IMPROVEMENTS_SKILLS.md` as a proposal. Do not edit this skill file in-session
unless the user asked to improve the skill itself (this invocation).
