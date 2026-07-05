---
name: notion-sync
description: Keep Notion engineering databases aligned with local repo changes using the repo's Notion sync rule and docs:notion-check helper.
---

# Notion Sync

Use this skill whenever a task changes engineering documentation, ADRs, architecture boundaries,
operational metadata, incidents, risks, maturity work, or launch readiness.

## Inputs

- Local git diff
- `docs/rules/notion-sync.md`
- `docs/notion/README.md`
- notion-axi CLI (see `docs/skills/notion-axi/SKILL.md`)

## Workflow

1. Finish local implementation and verification first.
2. Run `bun run docs:notion-check`.
3. Read each reported target and decide whether the change materially affects that Notion record.
4. **Search before creating** — run `npx -y notion-axi search "<target name>"` for each reported
   target. Note the `id` of any matching page or database row.
5. Update existing rows/pages via `npx -y notion-axi page update <id>` with:
   - `--set` for typed properties (Status, Owner, Date, etc.)
   - `--append` to add a markdown summary of what changed
   - repo path, PR link, Linear link, review date, and evidence as available
6. Create a new row only when search finds no match:
   `npx -y notion-axi page create --parent <db_id> --db --title "<name>" --set Status=... --content "..."`
7. Final response must name updated Notion targets, or name skipped targets with the reason.

## Useful notion-axi commands

```
# Find a database or page
npx -y notion-axi search "<target name>"

# Read a page or database schema
npx -y notion-axi page view <id>
npx -y notion-axi db view <id>

# Query database rows
npx -y notion-axi db query <id> --where Name="<value>"

# Update a page's properties and body
npx -y notion-axi page update <id> --set Status="Done" --set "Repo Path"="docs/adr/0012.md" --append

# Create a new database row
npx -y notion-axi page create --parent <db_id> --db --title "<name>" --set Status="Active" --content "<markdown>"

# Verify identity / workspace
npx -y notion-axi whoami
```

## Defaults

- Repo canonical: ADR bodies, binding rules, code-adjacent docs, schemas, route docs, and tested
  behavior.
- Notion canonical: roadmap, maturity, service ownership, risks, readiness, incidents, dashboards,
  and operational status.
- Write timing: end of task after local verification.

## If notion-axi Is Unavailable

Check whether `ntn` is installed and logged in:

```
curl -fsSL https://ntn.dev | bash   # install ntn
ntn login                            # authenticate (opens browser)
```

If the tool cannot be set up, do not block the local code change. Report:

- `bun run docs:notion-check` output
- target Notion databases/pages
- exact repo paths changed
- why notion-axi could not be used

The user or a later agent can apply the Notion updates manually.
