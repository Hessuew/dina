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
- **Windsurf / Devin**: `sentry` entry in `~/.codeium/windsurf/mcp_config.json` (Windsurf) or
  `~/.config/devin/mcp_config.json` (Devin) using
  `npx -y mcp-remote https://mcp.sentry.dev/mcp`; OAuth opens on first connect.

If the server shows "Needs authentication", stop and ask the user to complete the OAuth login
before continuing — the skill cannot authenticate headlessly.

## MCP Invocation — read this first

This skill is shared across editors, so the call style differs by host:

- **Windsurf / Devin** uses `mcp_call_tool`. **NEVER batch multiple `mcp_call_tool` calls in a
  single tool invocation** — each call must be made separately with the full
  `server_name: 'sentry'` parameter. Batching or omitting `server_name` causes a
  "missing field `server_name`" parse error.

  ```javascript
  mcp_call_tool({
    server_name: 'sentry',
    tool_name: 'get_sentry_resource',
    arguments: {
      url: 'https://my-org.sentry.io/issues/PROJECT-123',
    },
  })
  ```

- **Claude Code** calls the native `mcp__sentry__<tool>` tools directly.

**Discover the exact tool names from the connected server** at runtime using `search_sentry_tools`
before assuming a tool exists. Tool names on the hosted Sentry MCP have changed over time.
If a call fails with "tool not found", call `search_sentry_tools(query='...')` immediately to
find the correct name — never guess.

## Sentry MCP Tools Used

| Purpose                          | Verified tool (as of 2026-07)                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| Discover available catalog tools | `search_sentry_tools` — **call this if any tool is missing**                            |
| Resolve org / project context    | `find_organizations`, `find_projects`                                                   |
| List unresolved issues           | `search_issues` — use `is:unresolved` syntax or natural language with `projectSlugOrId` |
| Full detail + stack trace        | `get_sentry_resource` with `url` or `resourceType: 'issue'` + `resourceId`              |
| Breadcrumbs for an issue         | `get_sentry_resource` with same URL/ID but `resourceType: 'breadcrumbs'`                |
| AI root-cause analysis (paid)    | `analyze_issue_with_seer` — gracefully skip if 402 (no budget)                          |
| Event stats / aggregations       | `search_events`                                                                         |
| Mark resolved after fix ships    | `update_issue` (status → resolved)                                                      |

**Critical name corrections vs old skill versions:**

- `get_issue_details` → does NOT exist; use `get_sentry_resource` instead
- `find_issues` → may not exist; use `search_issues` instead

## Invocation Modes

| Command                       | Meaning                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `fix sentry`                  | List unresolved issues, pick/triage, propose a fix, implement after approval. |
| `fix sentry --dry-run`        | Fetch + triage + diagnosis only; never edit code or mutate Sentry.            |
| `fix sentry <ISSUE-ID/URL>`   | Go straight to one issue by Sentry short-ID or URL.                           |
| `fix sentry --project <slug>` | Scope the listing to a single Sentry project.                                 |

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

**Query guidance for `search_issues`:**

- Do NOT pass the issue short-ID (e.g. `DINA-D`) as the query — it will return nothing.
  Use `get_sentry_resource` with `resourceType: 'issue'` + `resourceId` for direct ID lookups.
- To list all unresolved issues in a project, pass `query: 'is:unresolved'` with
  `projectSlugOrId: '<slug>'`.
- Natural language that works: `"is:unresolved"`, `"level:error firstSeen:-7d"`.
- Natural language that reliably fails: `"unresolved issues in <project> sorted by frequency"`.

### 3. Triage the Chosen Issue

For the selected issue, make these calls **sequentially** (never batched):

1. `get_sentry_resource(url: '<issue_url>')` — full detail, stack trace, tags, latest event.
2. `get_sentry_resource(url: '<issue_url>', resourceType: 'breadcrumbs')` — event trail leading
   up to the error. This is a separate call even for the same issue URL.
3. `analyze_issue_with_seer(issueUrl: '<issue_url>')` — AI root-cause analysis.
   - If this returns **HTTP 402** ("No budget for Seer Autofix"), skip it gracefully and
     continue with manual analysis from the stack trace + breadcrumbs + codebase search.
   - Do NOT stop the workflow just because Seer is unavailable.

Map the top in-app culprit frame to the actual repo file and line. Read that code.
Prefer frames inside this repo's `src/**` over framework/vendor frames.

**If the stack trace shows only minified frames with `<unknown module>`**, source maps may not
be uploaded. Note this to the user. Still attempt to diagnose from:

- The breadcrumbs (often reveal the triggering sequence)
- The error message itself
- Searching the codebase for the error pattern

### 4. Present Diagnosis + Fix Plan

Show, before editing anything:

- **Root cause** — what actually throws, and why (from stack trace + breadcrumbs + Seer + read code).
- **Source map status** — note if the trace is minified/unresolvable; this limits confidence.
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
- Never batch `mcp_call_tool` calls (Windsurf/Devin); always include `server_name: 'sentry'`.
- If a tool call fails with "tool not found", call `search_sentry_tools` to discover the
  correct name — never retry with a guess.
- If the culprit frame can't be mapped to repo code with confidence, report that and ask —
  do not guess a fix location.

---

## Self-improvement

After using this skill, follow `docs/skills/SELF_IMPROVEMENT.md`: log any friction (tool-name
mismatches, missing Sentry MCP capabilities, workflow gaps) to `docs/skills/IMPROVEMENTS.md`
as a proposal. Do not edit this skill file in-session.
