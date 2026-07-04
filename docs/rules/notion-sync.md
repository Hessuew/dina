---
name: notion-sync
scope: docs/**, src/**, scripts/**, package.json, AGENTS.md, CLAUDE.md
enforced-by: review + bun run docs:notion-check
---

# Keep Notion aligned with repo changes

## Rule

When a change affects engineering knowledge, operational metadata, or launch readiness, update
the matching Notion page or database at the end of the task.

Use `bun run docs:notion-check` before final handoff to identify likely Notion targets from the
current git diff. The command is advisory: it tells the agent what to update, but it does not
write to Notion.

## Source-of-truth split

- **Repo wins** for code-shaped truth: ADR files, binding rules, code-adjacent README files,
  schema docs, route docs, implementation invariants, and tested behavior.
- **Notion wins** for engineering management: roadmap, maturity tracking, service ownership,
  operational status, dashboards, readiness reviews, incident tracking, risks, and follow-up work.

If repo docs and Notion disagree about an ADR or implementation invariant, update Notion to point
back to the repo source. If they disagree about roadmap, maturity, ownership, risk, readiness, or
operational status, update the repo only when that management decision changes code-facing rules
or docs.

## Trigger matrix

| Repo change                               | Notion target                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `docs/adr/*.md` added or changed          | ADR Register, ADR Index                                                       |
| Service/component boundary changes        | Service Catalog, Architecture Inventory                                       |
| API, database, queue, or integration work | Architecture Inventory, Data Management, Service Catalog when owner/SLO moves |
| SLI, SLO, dashboard, telemetry changes    | SLI/SLO Catalog, Operational Dashboards, Observability                        |
| Runbook docs added or changed             | Runbooks, Operations and Runbooks                                             |
| Incident or postmortem docs changed       | Incident Database, Incident Reviews                                           |
| Risk or technical-debt docs changed       | Risk Register or Technical Debt Register                                      |
| Significant launch or release plan        | Production Readiness Reviews, Engineering Roadmap                             |
| Engineering-system maturity work          | Engineering Maturity Items, Maturity Tracking                                 |
| Linear workflow/linking model changes     | Linear Integration Model                                                      |

## Agent workflow

1. Make and verify the local change first.
2. Run `bun run docs:notion-check`.
3. For every reported target, search/fetch the existing Notion row or page before creating a new
   one.
4. Update Notion with repo paths, PR/Linear links when available, status, evidence, owner/review
   date when known, and a short summary of what changed.
5. In the final response, list the Notion targets updated. If a target was skipped, say why.

## Notion write timing

Write to Notion once, at the end of the task, after tests and local docs are stable. For long
running incidents or launches, an agent may also create an initial tracking row when explicitly
asked, but the default is end-of-task sync.

## Enforcement

`bun run docs:notion-check` should be run before submitting tracked changes. Code review should
block changes that obviously modify ADRs, runbooks, SLOs, incidents, services, risks, readiness,
or maturity work without either:

- a matching Notion update, or
- an explicit final-response note explaining why no Notion update was possible or required.
