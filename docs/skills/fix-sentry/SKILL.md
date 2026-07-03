---
name: fix-sentry
description: >
  Fetches unresolved Sentry issues into the editor, triages them with stack
  traces and Seer root-cause analysis, proposes a fix, and implements it only
  after approval. Use when user says:
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

- Lists unresolved Sentry issues for the project, ranked by frequency/recency.
- Fetches full detail (stack trace, breadcrumbs) and runs Seer root-cause analysis.
- Maps the culprit frame to a repo file/line.
- Presents a diagnosis + fix plan, and implements the fix **only after approval**.
- Marks the Sentry issue resolved only after the fix ships and the user confirms — never on
  the strength of an un-merged local change.

## Requirements

The hosted Sentry MCP (`https://mcp.sentry.dev/mcp`) must be registered and authenticated:

- **Claude Code**: `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`, then
  authenticate via `/mcp` → `sentry` (browser OAuth).
- **Windsurf**: `sentry` entry in `~/.codeium/windsurf/mcp_config.json` using
  `npx -y mcp-remote https://mcp.sentry.dev/mcp`; OAuth opens on first connect.

If the server shows "Needs authentication", stop and ask the user to complete the OAuth login
before continuing — the skill cannot authenticate headlessly.

## MCP Invocation — read this first

This skill is shared across editors, so the call style differs by host:

- **Windsurf** uses `mcp_call_tool`. **NEVER batch multiple `mcp_call_tool` calls in a single
  tool invocation** — each call must be made separately with the full `server_name: 'sentry'`
  parameter. Batching or omitting `server_name` causes a "missing field `server_name`" parse
  error.

  ```javascript
  mcp_call_tool({
    server_name: 'sentry',
    tool_name: 'get_issue_details',
    arguments: {
      /* ... */
    },
  })
  ```

- **Claude Code** calls the native `mcp__sentry__<tool>` tools directly.

**Discover the exact tool names from the connected server** at runtime — the table below is
expected-but-verify. Hosted Sentry MCP tool names have changed over time; if a listed name is
absent, use the closest equivalent the server exposes.

## Sentry MCP Tools Used

| Purpose                              | Likely tool                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Resolve org / project context        | `find_organizations`, `find_projects`                                                |
| List / search unresolved issues      | `search_issues` / `find_issues` (natural-language, e.g. "unresolved issues in <project> sorted by freq") |
| Full detail + stack trace + breadcrumbs | `get_issue_details`                                                               |
| AI root-cause analysis               | `analyze_issue_with_seer`                                                             |
| Mark resolved after fix ships        | `update_issue` (status → resolved)                                                   |

If the server exposes different discovery/mutation tools, use those. If no tool can resolve
the org/project confidently, stop and ask the user.

## Invocation Modes

| Command                       | Meaning                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `fix sentry`                  | List unresolved issues, pick/triage, propose a fix, implement after approval.     |
| `fix sentry --dry-run`        | Fetch + triage + diagnosis only; never edit code or mutate Sentry.                |
| `fix sentry <ISSUE-ID/URL>`   | Go straight to one issue by Sentry short-ID or URL.                                |
| `fix sentry --project <slug>` | Scope the listing to a single Sentry project.                                      |

Default behavior is safe: no code edit and no Sentry mutation without explicit approval.

---

## Execution Steps

### 1. Resolve Org + Project

Resolve the Sentry organization and project once and cache it for the session. Use
`find_organizations` / `find_projects` if not obvious. Honor `--project <slug>` when passed.
If ambiguous, ask the user which project — do not guess.

### 2. List Unresolved Issues

Unless a specific issue ID/URL was passed, list unresolved issues ranked by frequency/recency
and present a short table for the user to pick from:

```text
Unresolved Sentry issues — <project>:
- ABC-123  TypeError: Cannot read 'SENTRY_DSN'   142 events   last 2h    src/server.ts
- ABC-456  Unhandled rejection in enrollment fn    31 events   last 1d    createServerFn
```

Include short-ID, title, event count, last-seen, and culprit. Let the user pick one (or more,
one at a time). Do not begin fixing until an issue is selected.

### 3. Triage the Chosen Issue

For the selected issue:

- `get_issue_details` → stack trace, breadcrumbs, tags, latest event.
- `analyze_issue_with_seer` → AI root-cause hypothesis and suggested fix location.
- Map the top in-app culprit frame to the actual repo file and line. Read that code.

Prefer the culprit frame that lives in this repo's `src/**` over framework/vendor frames.

### 4. Present Diagnosis + Fix Plan

Show, before editing anything:

- **Root cause** — what actually throws, and why (from stack trace + Seer + the read code).
- **Files to change** — repo-relative paths and the intended change.
- **Approach** — the minimal fix, and any test to add that reproduces the error.

**Stop here on `--dry-run`.** Otherwise wait for approval.

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

### 7. Resolve in Sentry — only on confirmation

Do **not** auto-resolve. A fix in the working tree is not live yet. Offer resolving as an
explicit follow-up, and only call `update_issue` (status → resolved) after the fix is
merged/deployed **and** the user confirms.

---

## Safety Contract

- Read-only fetch/triage first; no code edits or Sentry mutations without approval.
- `--dry-run` never mutates code or Sentry.
- Surgical diffs only — no unrelated cleanup or refactors.
- Never mark a Sentry issue resolved based on an un-merged local change.
- Never batch `mcp_call_tool` calls (Windsurf); always include `server_name: 'sentry'`.
- If the culprit frame can't be mapped to repo code with confidence, report that and ask —
  do not guess a fix location.

---

## Self-improvement

After using this skill, follow `docs/skills/SELF_IMPROVEMENT.md`: log any friction (tool-name
mismatches, missing Sentry MCP capabilities, workflow gaps) to `docs/skills/IMPROVEMENTS.md`
as a proposal. Do not edit this skill file in-session.
