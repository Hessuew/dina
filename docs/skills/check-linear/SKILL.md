---
name: check-linear
description: >
  Checks open, todo, in-progress, and in-review Linear issues from inside the
  editor, inspects connected GitHub PRs, and updates issue status when every
  connected PR is terminal. Use when user says:
    - "check linear"
    - "check linear issues"
    - "close merged linear issues"
    - "cleanup linear"
---

# Linear Issue Status Sync

## Core Intent

Keep Linear issue status aligned with connected GitHub PRs without leaving the editor.

The skill:

- Lists active Linear issues (`Backlog`, `Todo`, `In Progress`, `In Review`, or workspace equivalents).
- Extracts GitHub PR URLs from issue descriptions, links, and attachments.
- Checks each PR by full URL with GitHub CLI.
- Plans status updates only when every connected PR is terminal.
- Applies updates through Linear MCP after approval, or immediately when the user explicitly invokes `--yes`.

## Critical Implementation Requirements

**NEVER batch multiple `mcp_call_tool` calls in a single tool invocation.** Each `mcp_call_tool` call must be made separately with the full `server_name: 'linear'` parameter. Batching calls or omitting `server_name` will cause "Failed to parse arguments for tool 'mcp_call_tool': missing field `server_name'" errors.

Always use this pattern:

```javascript
mcp_call_tool({
  server_name: 'linear',
  tool_name: 'tool_name',
  arguments: {
    /* ... */
  },
})
```

Never batch calls like this:

```javascript
// WRONG - This will fail
mcp_call_tool({ server_name: 'linear', tool_name: 'list_issues', arguments: {...} })
mcp_call_tool({ server_name: 'linear', tool_name: 'get_issue', arguments: {...} })
```

## Status Rules

| Connected PR state                                | Linear action                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| All PRs merged                                    | Move issue to the workspace's completed state (`Done`, `Completed`, or equivalent).        |
| All PRs closed unmerged                           | Move issue to the workspace's canceled state (`Canceled`, `Won't Do`, or equivalent).      |
| Any PR open                                       | Skip; issue still has active implementation work.                                          |
| Mixed merged and closed-unmerged PRs, no open PRs | Skip by default and report as `needs review`; do not guess whether it is done or canceled. |
| No PR links                                       | Skip and report as `no PRs found`.                                                         |
| Invalid or inaccessible PR URL                    | Skip the issue and report the PR error.                                                    |

Never move a merged issue to a canceled state. Never move a closed-unmerged PR issue to a completed state.

---

## Linear MCP Tools Used

| Purpose                               | Tool               |
| ------------------------------------- | ------------------ |
| List candidate issues                 | `list_issues`      |
| Get issue details + links             | `get_issue`        |
| Update issue state                    | `save_issue`       |
| Resolve workflow status, if available | `get_issue_status` |

If the active MCP server exposes different status/state discovery tools, use those. If no tool can resolve target state IDs confidently, stop before mutation and ask the user for the exact completed/canceled state IDs.

---

## Invocation Modes

| Command                  | Meaning                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `check linear`           | Read-only scan, then ask before applying any Linear updates. |
| `check linear --dry-run` | Read-only scan only; never mutate Linear.                    |
| `check linear --yes`     | Scan and apply unambiguous updates without a second prompt.  |
| `check linear LIN-123`   | Process only the named issue.                                |

Default behavior is safe: no `save_issue` call without either explicit `--yes` or a direct approval after the plan is shown.

---

## Execution Steps

### 1. Determine Candidate Issues

Fetch active issues only. Use workspace state names when known; otherwise start with common active states.

**IMPORTANT:** Do NOT batch multiple `mcp_call_tool` calls in a single tool invocation. Each `mcp_call_tool` call must be made separately with the full `server_name` parameter. The `state` parameter accepts a single string, not an array.

```javascript
mcp_call_tool({
  server_name: 'linear',
  tool_name: 'list_issues',
  arguments: {
    state: 'In Progress',
    limit: 250,
  },
})
```

Query each active state separately:

```javascript
mcp_call_tool({
  server_name: 'linear',
  tool_name: 'list_issues',
  arguments: { state: 'In Progress', limit: 250 },
})
mcp_call_tool({
  server_name: 'linear',
  tool_name: 'list_issues',
  arguments: { state: 'In Review', limit: 250 },
})
mcp_call_tool({
  server_name: 'linear',
  tool_name: 'list_issues',
  arguments: { state: 'Todo', limit: 250 },
})
mcp_call_tool({
  server_name: 'linear',
  tool_name: 'list_issues',
  arguments: { state: 'Backlog', limit: 250 },
})
mcp_call_tool({
  server_name: 'linear',
  tool_name: 'list_issues',
  arguments: { state: 'Started', limit: 250 },
})
```

Rules:

- Do NOT batch multiple `mcp_call_tool` calls in a single tool invocation
- Each `mcp_call_tool` call must include the `server_name: 'linear'` parameter
- The `state` parameter accepts a single string, not an array
- Do not process archived issues.
- Do not process issues already in terminal states (`Done`, `Completed`, `Closed`, `Canceled`, etc.).
- If a `limit` is reached and pagination exists, continue paging. If no pagination is available, query per active state to reduce missed issues.
- If the user passed an explicit issue ID, call `get_issue` for that issue and skip broad listing.

### 2. Resolve Target Linear States Before Planning Mutations

Before any update, identify the actual workspace state names for:

- Completed work: prefer state names `Done`, `Completed`, or `Closed` when their type/category is completed.
- Canceled work: prefer state names `Canceled`, `Cancelled`, `Won't Do`, or equivalent when their type/category is canceled.

Resolution order:

1. Use Linear MCP workflow/status tooling if available, such as `get_issue_status`, to resolve the real state names. Note: `get_issue_status` requires `name`, `team`, and `id` parameters. Use empty string for `id` when querying by name.
2. If no direct status-listing tool exists, inspect existing terminal issues returned by `list_issues` for known completed/canceled state names.
3. If the state name is still ambiguous, stop before mutation and ask the user for the exact target state name.

Do not use placeholder names like `done` or `canceled` unless the MCP response proves those are valid names in this workspace. Use state names (like "Done" or "Canceled") directly in `save_issue` calls via the `state` parameter, not `stateId`.

### 3. Fetch Full Issue Details

For each candidate issue, fetch full details including relation/link data.

**IMPORTANT:** Do NOT batch multiple `mcp_call_tool` calls. Call `get_issue` separately for each issue, always including the `server_name` parameter.

```javascript
mcp_call_tool({
  server_name: 'linear',
  tool_name: 'get_issue',
  arguments: {
    id: issueId,
    includeRelations: true,
  },
})
```

Extract PR URLs from:

- Issue description/body.
- Issue `links` field populated by `graphite-linear-connector`.
- Attachments or relation payloads, if present.

Use this URL pattern and de-duplicate results:

```text
https://github.com/<owner>/<repo>/pull/<number>
https://github.com/<owner>/<repo>/pulls/<number>
```

### 4. Check GitHub PR State by URL

Use the full PR URL, not only the PR number, so cross-repository links work:

```bash
gh pr view "<pr-url>" --json number,title,url,state,mergedAt,closed,closedAt
```

Interpret the response:

- `state == "MERGED"` or `mergedAt != null` -> merged.
- `closed == true` and `mergedAt == null` -> closed unmerged.
- Otherwise -> open/in-progress.

If `gh` returns an auth, permission, rate-limit, or not-found error, mark that PR as `unknown` and skip updating the issue. Continue scanning other issues.

### 5. Build an Update Plan

For each issue with PR links:

- If every PR is merged, plan `state: <completed-state-name>`.
- If every PR is closed unmerged, plan `state: <canceled-state-name>`.
- If any PR is open, plan no update.
- If PRs are mixed terminal states, plan no update and mark `needs review`.
- If any PR is unknown, plan no update.

The plan must include enough evidence for review:

```text
Will update 2 issues:
- LIN-123 -> Done: PR #45 merged at 2026-06-11T12:34:56Z
- LIN-456 -> Canceled: PR #78 closed unmerged at 2026-06-11T13:00:00Z

Skipped 4 issues:
- LIN-111: no PRs found
- LIN-222: PR #90 still open
- LIN-333: mixed merged and closed-unmerged PRs; needs review
- LIN-444: PR URL inaccessible
```

### 6. Apply Updates Safely

Only call `save_issue` when the user passed `--yes` or approved the displayed plan.

**IMPORTANT:** Do NOT batch multiple `mcp_call_tool` calls. Call `save_issue` separately for each issue, always including the `server_name` parameter. Use the `state` parameter (not `stateId`) with the state name like "Done" or "Canceled".

```javascript
mcp_call_tool({
  server_name: 'linear',
  tool_name: 'save_issue',
  arguments: {
    id: issueId,
    state: 'Done', // Use state name, not stateId
  },
})
```

Safety requirements:

- Never apply a placeholder or guessed `stateId`.
- Never update an issue with open, mixed, unknown, or missing PR status.
- Apply only the planned issue IDs and state names; do not edit title, description, assignee, labels, priority, links, or project metadata.
- If one update fails, report it and continue with the remaining approved updates unless the failure indicates global auth/permission loss.
- Always include `server_name: 'linear'` in every `mcp_call_tool` call.

### 7. Report Results

Final report format:

```text
Checked X active Linear issues
Updated Y issues:
- LIN-123: Done (PR #45 merged at 2026-06-11T12:34:56Z)
- LIN-456: Canceled (PR #78 closed unmerged at 2026-06-11T13:00:00Z)

Skipped Z issues:
- N no PRs found
- N open PRs
- N mixed terminal PRs needing review
- N unknown/inaccessible PRs

Failed W updates:
- LIN-789: Linear save_issue returned <short error>
```

When there are no eligible updates, say so explicitly and do not ask for approval.

---

## Edge Cases

### Multiple PRs

Only update when every connected PR points to the same terminal outcome:

- all merged -> completed state
- all closed unmerged -> canceled state

Mixed terminal outcomes are ambiguous and must be reported without mutation.

### Duplicate or Redirected PR URLs

Normalize and de-duplicate PR URLs by owner, repo, and number before checking GitHub. If GitHub returns a canonical `url`, use that URL in the report.

### Archived or Already Terminal Issues

Skip archived issues and issues already in completed/canceled terminal states. Do not reopen or move terminal issues.

### State ID Mismatch

If `save_issue` fails due to invalid `stateId`:

- Stop applying further updates that use that state ID.
- Report the failed issue and state ID.
- Ask the user for the correct workspace state ID before retrying.

---

## Safety Contract

- Read-only scan first unless invoked with `--yes`.
- Mutations require explicit approval or explicit `--yes`.
- No guessed Linear state IDs.
- No updates unless all connected PRs are terminal and unambiguous.
- No unrelated Linear edits.
- Clear evidence in every planned and completed update.
