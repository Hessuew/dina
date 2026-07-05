# Notion Sync Map

This repo uses Notion as the engineering management surface and the repo as the canonical source
for code-shaped truth. Agents should use this page together with
[`docs/rules/notion-sync.md`](../rules/notion-sync.md).

## Workspace Structure

Root page:

- `🏗️ School Platform Engineering`

Hub pages:

- `🗺️ Engineering Roadmap`
- `🏛️ System Architecture`
- `📖 Engineering Handbook`
- `🛡️ Reliability`
- `🔭 Observability`
- `🚦 CI/CD and Safe Delivery`
- `🔐 Security`
- `⚡ Performance and Scale`
- `🧰 Operations and Runbooks`
- `🗄️ Data Management`
- `🧪 Testing Strategy`
- `📚 Architecture Decision Records`
- `📉 Technical Debt Register`
- `🚨 Incident Reviews`
- `🔗 Linear Integration Model`
- `📊 Maturity Tracking`
- `📋 Runbook Templates`
- `🧾 ADR Index`

Databases:

- `Engineering Maturity Items`
- `ADR Register`
- `Service Catalog`
- `SLI/SLO Catalog`
- `Runbooks`
- `Incident Database`
- `Architecture Inventory`
- `Risk Register`
- `Production Readiness Reviews`
- `Operational Dashboards`

## Canonical Ownership

- ADR bodies live in `docs/adr/`. Notion indexes them and tracks review metadata.
- Binding agent and engineering rules live in `docs/rules/`. Notion may summarize maturity or
  policy status, but not fork rule text.
- Local route, component, database, and utility docs live beside code. Notion links to these docs
  from service, architecture, readiness, and runbook records.
- Incidents, maturity items, risks, readiness reviews, dashboard links, and service ownership live
  in Notion. Repo docs reference them only when the codebase needs stable context.

## Required Row Fields

Use the fields that exist in the target Notion database. When fields are available, prefer:

- Title or Name
- Status
- Priority
- Owner
- Repo path or canonical source link
- Linear issue link
- PR link
- Evidence link or verification note
- Last reviewed date
- Next review date

Do not invent duplicate Notion pages when a row already exists. Search first, update existing rows,
and add repo/PR/Linear links as evidence.

## Update Routing

| Local signal                              | Notion update                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| New or changed ADR in `docs/adr/`         | Update `ADR Register`; refresh `🧾 ADR Index` if needed.                      |
| New service boundary or ownership change  | Update `Service Catalog`; link dashboards/runbooks/SLOs if known.             |
| API, DB, queue, integration shape changes | Update `Architecture Inventory`; update `Data Management` for DB changes.     |
| SLO/SLI/telemetry/dashboard work          | Update `SLI/SLO Catalog`, `Operational Dashboards`, and `🔭 Observability`.   |
| Runbook added or materially changed       | Update `Runbooks` and `🧰 Operations and Runbooks`.                           |
| Incident/postmortem work                  | Update `Incident Database`, `🚨 Incident Reviews`, and linked Linear actions. |
| Risk or debt discovered/changed           | Update `Risk Register` or `📉 Technical Debt Register`.                       |
| Launch readiness work                     | Update `Production Readiness Reviews` and `🗺️ Engineering Roadmap`.           |
| Engineering-system maturity change        | Update `Engineering Maturity Items` and `📊 Maturity Tracking`.               |

## Agent Final Response

Every agent that triggers this rule should include a short Notion sync line:

```text
Notion sync: updated ADR Register and Architecture Inventory. Skipped Service Catalog because
ownership/SLOs did not change.
```

If the Notion connector is unavailable, say so and include the exact targets that need manual
update.
