---
name: notion-sync
scope: docs/**, src/**, scripts/**, package.json, AGENTS.md, CLAUDE.md
enforced-by: review + bun run docs:notion-check
---

# Keep Notion aligned with repo changes

## Rule

When a change affects engineering knowledge, operational metadata, or launch
readiness, update the matching Notion page or database at the end of the task.

Use `bun run docs:notion-check` before final handoff to identify likely Notion
targets from the current git diff. The command is advisory: it tells the agent
**what** to update (rule id, names, stable UUIDs, recipe anchors) but does not
write to Notion.

The full workspace inventory, property schemas, select option labels, and
step-by-step recipes live in [`docs/notion/README.md`](../notion/README.md).
Agents must follow those recipes rather than free-form workspace search.

Skill entrypoint: [`docs/skills/notion-sync/SKILL.md`](../skills/notion-sync/SKILL.md).

## Source-of-truth split

- **Repo wins** for code-shaped truth: ADR files, binding rules, code-adjacent
  README files, schema docs, route docs, implementation invariants, and tested
  behavior.
- **Notion wins** for engineering management: roadmap, maturity tracking,
  service ownership, operational status, dashboards, readiness reviews, incident
  tracking, risks, and follow-up work.

If repo docs and Notion disagree about an ADR or implementation invariant,
update Notion to point back to the repo source. If they disagree about roadmap,
maturity, ownership, risk, readiness, or operational status, update the repo
only when that management decision changes code-facing rules or docs.

## Trigger matrix

| Repo change                               | Notion target (rule id)                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `docs/adr/*.md` added or changed          | ADR Register + ADR Index (`adr-register`)                                                |
| Service/component boundary changes        | Architecture Inventory + Service Catalog when ownership moves (`architecture-inventory`) |
| API, database, queue, or integration work | Architecture Inventory + Data Management (`data-management` / inventory)                 |
| SLI, SLO, dashboard, telemetry changes    | Observability hub + SLI/SLO Catalog + Operational Dashboards (`observability`)           |
| Runbook docs added or changed             | Runbooks + Operations and Runbooks (`runbooks`)                                          |
| Incident or postmortem docs changed       | Incident Database + Incident Reviews (`incidents`)                                       |
| Risk or technical-debt docs changed       | Risk Register or Technical Debt Register (`risk-debt`)                                   |
| Significant launch or release plan        | Production Readiness Reviews + Engineering Roadmap (`readiness-roadmap`)                 |
| Engineering-system maturity work          | Engineering Maturity Items + Maturity Tracking (`maturity`)                              |
| Linear workflow/linking model changes     | Linear Integration Model (`linear-integration`)                                          |

Stable UUIDs for every target are listed in `docs/notion/README.md` and echoed
by `bun run docs:notion-check`.

## Agent workflow

1. Make and verify the local change first.
2. Run `bun run docs:notion-check`.
3. For every reported rule id, open the matching recipe in
   `docs/notion/README.md` and use the UUIDs from the report.
4. Find existing rows with `db query <DB_ID> --where …` before create.
5. Update via `npx -y notion-axi page update <id>` with exact select labels from
   the inventory schemas; append dated hub-page notes when the recipe says so.
6. Create a new row only when the recipe allows it and query finds no match.
7. In the final response, list Notion targets updated. If a target was skipped,
   say why.

## Notion write timing

Write to Notion once, at the end of the task, after tests and local docs are
stable. For long-running incidents or launches, an agent may also create an
initial tracking row when explicitly asked, but the default is end-of-task sync.

## Enforcement

`bun run docs:notion-check` should be run before submitting tracked changes.
Code review should block changes that obviously modify ADRs, runbooks, SLOs,
incidents, services, risks, readiness, or maturity work without either:

- a matching Notion update per the inventory recipes, or
- an explicit final-response note explaining why no Notion update was possible
  or required.
