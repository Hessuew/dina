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
- Notion connector search/fetch/update tools when available

## Workflow

1. Finish local implementation and verification first.
2. Run `bun run docs:notion-check`.
3. Read each reported target and decide whether the change materially affects that Notion record.
4. Search Notion before creating anything.
5. Update existing Notion rows/pages with:
   - repo path or canonical source link
   - PR link when available
   - Linear link when available
   - status/evidence/review date when known
   - concise summary of the change
6. Create a new Notion row only when search finds no matching existing row.
7. Final response must name updated Notion targets, or name skipped targets with the reason.

## Defaults

- Repo canonical: ADR bodies, binding rules, code-adjacent docs, schemas, route docs, and tested
  behavior.
- Notion canonical: roadmap, maturity, service ownership, risks, readiness, incidents, dashboards,
  and operational status.
- Write timing: end of task after local verification.

## If Notion Tools Are Unavailable

Do not block the local code change. Report:

- `bun run docs:notion-check` output
- target Notion databases/pages
- exact repo paths changed
- why the connector could not be updated

The user or a later agent can apply the Notion updates manually.
