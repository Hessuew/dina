---
name: notion-sync
description: Keep Notion engineering databases aligned with local repo changes using the repo Notion inventory, hard object IDs, and per-trigger update recipes.
---

# Notion Sync

Use this skill whenever a task changes engineering documentation, ADRs,
architecture boundaries, operational metadata, incidents, risks, maturity work,
or launch readiness.

**Primary map (source of IDs + recipes):** [`docs/notion/README.md`](../../notion/README.md)  
**Binding rule:** [`docs/rules/notion-sync.md`](../../rules/notion-sync.md)  
**CLI:** `notion-axi` — see [`docs/skills/notion-axi/SKILL.md`](../notion-axi/SKILL.md)

Do **not** rediscover the workspace by free-form search on every run. The map
lists every hub page and database the agent is allowed to update, with stable
UUIDs, property schemas, select option labels, and copy-paste recipes.

## Inputs

- Local git diff / changed paths
- `bun run docs:notion-check` output (rule ids, target names, **UUIDs**, recipe anchors)
- `docs/notion/README.md` inventory + recipe sections
- notion-axi CLI

## Workflow

1. Finish local implementation and verification first.
2. Run:
   ```bash
   bun run docs:notion-check
   # or machine-readable:
   bun run docs:notion-check --json
   ```
3. For **each** reported rule `id`, open the matching recipe in
   `docs/notion/README.md` (anchors `recipe-<id>` with underscores matching rule
   ids such as `recipe-adr-register`).
4. Execute that recipe using the **hardcoded UUIDs** from the check report / map.
   - Find rows with `db query <DB_ID> --where …`, not workspace search.
   - Update with `page update <ROW_OR_PAGE_ID> --set …` and/or `--append`.
   - Create with `page create --parent <DB_ID> --db …` **only** when query finds
     no match (and recipe allows create).
5. Use **exact** select option labels from the map. Never invent Status/Area/
   Type values.
6. Skip a target when the change is not material for that record; keep the
   reason for the final response.
7. Final response must name updated Notion targets (with ids or titles), or
   name skipped targets with reasons.

## Decision rules (no guessing)

| Question                     | Answer                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Where is object X?           | UUID in `docs/notion/README.md` / check report                                                       |
| Which properties exist?      | Schema tables in that map                                                                            |
| Which select values allowed? | Exact labels listed in map                                                                           |
| Create or update?            | Query DB by title property first; create only if no match                                            |
| Hub page body?               | `--append` dated section; `--replace` only for full ADR Index rebuilds                               |
| People fields?               | Skip unless you have a Notion user UUID                                                              |
| Template rows?               | Never overwrite `Template - production incident review` or `Template - significant launch readiness` |
| When write?                  | End of task after local verification                                                                 |

## Useful commands (always `npx -y notion-axi`)

```bash
npx -y notion-axi whoami

# Schema + options (data source id from inventory)
npx -y notion-axi db view 38ded322-783b-425d-9be1-d4ba48f79c08

# Find a row inside a known DB (prefer this over search)
npx -y notion-axi db query 38ded322-783b-425d-9be1-d4ba48f79c08 \
  --where "Number=0017" --full --limit 5

# Update properties / append body
npx -y notion-axi page update <id> \
  --set Status=Accepted \
  --set "GitHub ADR=https://github.com/Hessuew/dina/blob/main/docs/adr/….md" \
  --append "## 2026-07-15 Title\n- bullet\n"

# Create a DB row only when missing
npx -y notion-axi page create \
  --parent 38ded322-783b-425d-9be1-d4ba48f79c08 --db \
  --title "Title" --set Status=Proposed --content "…"
```

Workspace-wide `search` is a **fallback** when inventory is stale or an ID
fails with `OBJECT_NOT_FOUND`. If search finds a renamed/moved object, update
`docs/notion/README.md` and `scripts/notion-check.domain.mjs` in the same
change when practical; otherwise report the drift.

## Defaults

- **Repo canonical:** ADR bodies, binding rules, code-adjacent docs, schemas,
  route docs, tested behavior.
- **Notion canonical:** roadmap, maturity, service ownership, risks, readiness,
  incidents, dashboards, operational status.
- **Write timing:** end of task after local verification.

## If notion-axi is unavailable

```bash
curl -fsSL https://ntn.dev | bash   # install ntn if needed
ntn login                            # authenticate
```

Do not block the local code change. Report:

- full `bun run docs:notion-check` output
- target names + UUIDs from the inventory
- exact repo paths changed
- why Notion could not be written

The user or a later agent applies the recipes manually.
