---
name: sentry-axi
description: >
  Operate Sentry through the sentry-axi CLI — list and triage unresolved issues; view
  issue detail with stack traces; resolve, mute, or re-open issues; inspect releases;
  and browse projects and organizations. Prefer this over the Sentry MCP or raw
  sentry-cli for agent-driven Sentry operations. Use whenever a task touches Sentry:
  reading issue counts, fetching stack traces, managing issue status, or checking
  release health.
user-invocable: false
metadata:
  hermes:
    tags: [sentry, errors, issues, monitoring, observability]
    category: devops
---

# sentry-axi

Agent-ergonomic Sentry CLI. Prefer this over the Sentry MCP or raw `sentry-cli` for
issue management, triage, and release inspection.

Invoke as:

```sh
node scripts/sentry-axi.mjs <command>
```

## Authentication

`SENTRY_AXI_AUTH_TOKEN` must be set before any command (except `setup`).

```sh
export SENTRY_AXI_AUTH_TOKEN=<your-token>
```

Get a token at **https://sentry.io/settings/account/api/auth-tokens/**

Required scopes: **`org:read` `event:read` `event:admin`**

> The `org:ci` scope used by `sentry-cli` for source-map uploads is **not enough**.
> Create a separate token with the scopes above for sentry-axi.
> Keep the existing `SENTRY_AUTH_TOKEN` reserved for Sentry build/source-map upload tooling.

**Optional context env vars (set once, apply to all commands):**

```sh
export SENTRY_ORG=cherubim-it          # DINA default org
export SENTRY_PROJECT=dina             # DINA default project (web app)
export SENTRY_URL=https://...          # only for self-hosted Sentry
```

DINA agents: always use `cherubim-it` / `dina` unless the user overrides `--project`
(e.g. `react-native`). The `fix-sentry` skill hardcodes these defaults.

If a command fails with `AUTH_REQUIRED`, set `SENTRY_AXI_AUTH_TOKEN`.
If it fails with `AUTH_ERROR`, check that the token has the required scopes above.

## When to use

Use sentry-axi whenever a task touches Sentry:

- Checking how many unresolved issues exist in a project
- Fetching a stack trace for a specific issue before fixing it
- Marking an issue as resolved after a fix ships
- Inspecting which errors a release introduced
- Discovering org and project slugs

## Workflow

1. Run with no args for a compact dashboard (top 5 unresolved + latest release).
2. `issues list` to see all unresolved issues. Note the `id` column (short ID like `PROJ-123`).
3. `issues view <id>` reads full detail + stack trace (~1500 chars by default; add `--full` for all frames).
4. Fix the code. Then `issues resolve <id>` to mark it done.
5. `releases list` to inspect recent releases; `releases view <version>` for per-release issue counts.
6. Every response ends with contextual `help:` hints — follow them.

## Commands

```
commands[12]:
  (none)=home, issues, releases, projects, orgs, whoami, setup
  issues subcommands: list, view, resolve, mute, unresolve
  releases subcommands: list, view
```

Run `node scripts/sentry-axi.mjs --help` for all flags.

## Flags reference

| Command         | Flags                                                                                |
| --------------- | ------------------------------------------------------------------------------------ |
| global          | `--org <slug>` `--project <slug>` `--help` `--version`                               |
| `issues list`   | `--status unresolved\|resolved\|muted` `--limit <n>` `--query <sentry-search-query>` |
| `issues view`   | `--full` (show complete stack trace instead of first 1500 chars)                     |
| `releases list` | `--limit <n>` (default: 10)                                                          |

## Tips

- Output is TOON-encoded and token-efficient; never pipe through `grep` unless the list is enormous.
- Short IDs (e.g. `PROJ-123`) are accepted everywhere — `--org` must be set (or `SENTRY_ORG`) when using short IDs so the API can resolve them.
- Numeric IDs (e.g. `1234567890`) work without `--org`.
- Mutations are idempotent: resolving an already-resolved issue returns `(no-op)` with exit 0.
- `issues view` includes a stack-trace preview truncated at 1500 chars. Add `--full` for long traces or minified-but-partially-readable frames.
- If the stack trace shows only `at (anonymous) (?)` frames, source maps are not uploaded; diagnose from the error message and breadcrumbs instead.
- `--query` accepts any Sentry search syntax: `is:unresolved level:error firstSeen:-7d assigned:me`.
- Exit codes: 0 success, 1 error, 2 usage error. Errors are structured TOON with `error`, `code`, and `help` fields.

## Example session

```sh
# Check current error status
node scripts/sentry-axi.mjs

# List all unresolved issues in a project
node scripts/sentry-axi.mjs issues list --project my-app

# Inspect a specific issue
node scripts/sentry-axi.mjs issues view MYAPP-456

# View full stack trace
node scripts/sentry-axi.mjs issues view MYAPP-456 --full

# Resolve after fix
node scripts/sentry-axi.mjs issues resolve MYAPP-456

# Check the latest release
node scripts/sentry-axi.mjs releases list
```
