---
name: linear-axi
description: 'Operate Linear through the repo-local linear-axi wrapper over linear-cli. Use whenever a task touches Linear: listing or viewing issues, creating or updating work items, reading or posting comments, checking teams/projects/statuses, or marking branch issues done.'
user-invocable: false
metadata:
  hermes:
    tags: [linear, issues, projects, planning, tracking]
    category: project-management
---

# linear-axi

Agent-ergonomic Linear CLI. Prefer this wrapper over direct `linear-cli` and raw Linear MCP calls for normal Linear work in this repo.

Run it from the repo root:

```bash
node scripts/linear-axi.mjs <command>
```

The wrapper delegates to installed `linear-cli`, forces machine-readable output, converts results to TOON, and normalizes errors. `linear-cli` must be installed and authenticated. If the wrapper returns `AUTH_REQUIRED`, run `linear-cli auth` or configure the Linear API key outside the agent.

In Codex, API-backed Linear commands may need approval/escalation because the restricted sandbox can make `linear-cli` panic during macOS system proxy detection. If `DEPENDENCY_CRASH` appears but the same command works with approval, the fix is to run `node scripts/linear-axi.mjs ...` unsandboxed/approved, not to fall back to MCP.

## When to use

Use linear-axi whenever a task touches Linear: listing or filtering issues, viewing issue details, creating or updating issues, reading or posting comments, checking team/status/project metadata, searching issues, or closing the current branch issue.

Use direct `linear-cli` only when the wrapper does not expose a needed command. Use Linear MCP only when `linear-cli` lacks the capability entirely.

## Workflow

1. Run `node scripts/linear-axi.mjs` with no args for a compact dashboard: current branch issue plus assigned issues.
2. Discover team keys with `node scripts/linear-axi.mjs teams list`.
3. List issues with focused filters: `issues list --mine`, `--team <key>`, `--state <name>`, `--project <name>`, `--label <name>`, and `--limit <n>`.
4. Drill into details with `issues view <id>`; add `--comments` for comments and `--full` for untruncated description text.
5. Preview issue creation with `issues create "Title" --team <team> --dry-run`; remove `--dry-run` only when the issue should be created.
6. Update issues with `issues update <id> --state Done`, `--assignee me`, `--priority <n>`, `--due <date>`, or `--project <project>`.
7. Read and post comments with `comments list <issue-id>` and `comments create <issue-id> --body "Markdown"`.
8. For unsupported Linear CLI commands, use `raw -- <linear-cli args...>`. The wrapper still applies safe JSON output defaults.

## Commands

```text
commands[13]:
  (none)=dashboard
  issues list
  issues view <id>
  issues create <title>
  issues update <id>
  comments list <issue-id>
  comments create <issue-id>
  teams list
  projects list
  statuses list --team <team>
  search issues <query>
  done
  raw -- <linear-cli args...>
```

Run `node scripts/linear-axi.mjs --help` for command examples.

## Common patterns

### Dashboard

```bash
node scripts/linear-axi.mjs
```

### List my work

```bash
node scripts/linear-axi.mjs issues list --mine --limit 20
```

### Filter by team and status

```bash
node scripts/linear-axi.mjs issues list --team ENG --state "In Progress" --limit 25
```

### View issue details

```bash
node scripts/linear-axi.mjs issues view ENG-123
node scripts/linear-axi.mjs issues view ENG-123 --comments
node scripts/linear-axi.mjs issues view ENG-123 --full
```

### Create an issue safely

```bash
node scripts/linear-axi.mjs issues create "Fix enrollment edge case" --team ENG --priority 2 --assignee me --dry-run
node scripts/linear-axi.mjs issues create "Fix enrollment edge case" --team ENG --priority 2 --assignee me
```

For long descriptions, write markdown to a file and pass `--description-file <path>`.

### Update an issue

```bash
node scripts/linear-axi.mjs issues update ENG-123 --state Done
node scripts/linear-axi.mjs issues update ENG-123 --assignee me --due +3d
node scripts/linear-axi.mjs issues update ENG-123 --label bug --label urgent
```

### Comments

```bash
node scripts/linear-axi.mjs comments list ENG-123
node scripts/linear-axi.mjs comments create ENG-123 --body "Fixed in the current branch."
```

### Metadata

```bash
node scripts/linear-axi.mjs teams list
node scripts/linear-axi.mjs projects list
node scripts/linear-axi.mjs statuses list --team ENG
```

### Escape hatch

```bash
node scripts/linear-axi.mjs raw -- cycles list --team ENG
node scripts/linear-axi.mjs raw -- labels list --team ENG
```

## Tips

- Output is TOON, not JSON. It is optimized for agent consumption.
- The wrapper validates known flags and fails loudly on unknown flags.
- Issue creation is not idempotent. Search first when duplicate creation matters.
- `--description-file` and `--body-file` avoid shell quoting problems for multiline markdown.
- Priorities match Linear convention: `0` none, `1` urgent, `2` high, `3` normal, `4` low.
- Due dates are interpreted by `linear-cli`: examples include `today`, `tomorrow`, `+3d`, `+1w`, and `YYYY-MM-DD`.
- `done` delegates to `linear-cli done` and uses the current git branch to find the Linear issue.
- If a command returns `DEPENDENCY_CRASH`, the underlying `linear-cli` crashed before returning data. In Codex this usually means the restricted sandbox blocked macOS system proxy detection; retry the same `node scripts/linear-axi.mjs ...` command with approval/escalation.
- If the wrapper does not expose a command, prefer `raw -- ...` before falling back to MCP.
