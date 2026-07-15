# Notion Sync Map

This repo uses Notion as the engineering management surface and the repo as the
canonical source for code-shaped truth. Agents must use this page together with
[`docs/rules/notion-sync.md`](../rules/notion-sync.md) and
[`docs/skills/notion-sync/SKILL.md`](../skills/notion-sync/SKILL.md).

**Do not invent pages or databases.** Use the stable IDs below. Search only when
an ID is missing from this map or a create path needs a row title that is not
listed.

Verified live against workspace token on **2026-07-15** via
`npx -y notion-axi` (`ntn login` / Notion CLI bot).

---

## Source-of-truth split

- **Repo wins** for code-shaped truth: ADR bodies in `docs/adr/`, binding rules
  in `docs/rules/`, code-adjacent README files, schemas, route docs,
  implementation invariants, and tested behavior.
- **Notion wins** for engineering management: roadmap, maturity, service
  ownership, operational status, dashboards, readiness reviews, incidents,
  risks, and follow-up work.
- If repo docs and Notion disagree about an ADR or implementation invariant,
  update Notion to point back to the repo. If they disagree about roadmap /
  maturity / ownership / risk / readiness / operational status, update the repo
  only when that management decision changes code-facing rules or docs.

---

## Workspace inventory (stable IDs)

All UUIDs below work with `npx -y notion-axi`. Database IDs are **data_source**
IDs (what `search` / `db view` / `db query` / `page create --parent … --db`
accept). Prefer these IDs over search.

### Root

| Object                               | Kind | ID                                     |
| ------------------------------------ | ---- | -------------------------------------- |
| DINA - Disciplers of Nations Academy | page | `3933061b-4c67-81d0-af6d-e0d31f5e5ee3` |

### Hub pages

| Title                            | ID                                     |
| -------------------------------- | -------------------------------------- |
| 🗺️ Engineering Roadmap           | `3933061b-4c67-81bf-9387-e4cc5de8112b` |
| 🏛️ System Architecture           | `3933061b-4c67-8164-ae43-d455f9217ac5` |
| 📖 Engineering Handbook          | `3933061b-4c67-81dd-b99b-f7109f4cce8c` |
| 🛡️ Reliability                   | `3933061b-4c67-813d-8a69-f72ab3ba7e49` |
| 🔭 Observability                 | `3933061b-4c67-8137-80ae-f1ee7c8fa9a0` |
| 🚦 CI/CD and Safe Delivery       | `3933061b-4c67-81f5-892f-df0de211e11b` |
| 🔐 Security                      | `3933061b-4c67-818c-a403-f301a92154bd` |
| ⚡ Performance and Scale         | `3933061b-4c67-8132-854b-fa864966f5e2` |
| 🧰 Operations and Runbooks       | `3933061b-4c67-81b9-b9b0-de89f73150f6` |
| 🗄️ Data Management               | `3933061b-4c67-812f-a41a-db4edf438e25` |
| 🧪 Testing Strategy              | `3933061b-4c67-8171-bbc7-f23409f29826` |
| 📚 Architecture Decision Records | `3933061b-4c67-81b2-a7e7-fbfb8757bf72` |
| 📉 Technical Debt Register       | `3933061b-4c67-81c9-85d4-e8ecdba2eead` |
| 🚨 Incident Reviews              | `3933061b-4c67-8136-84c8-ea3af120b563` |
| 🔗 Linear Integration Model      | `3933061b-4c67-816c-833c-cd0284156564` |
| 📊 Maturity Tracking             | `3933061b-4c67-813b-9f21-f08be2c9dfd3` |
| 📋 Runbook Templates             | `3933061b-4c67-8143-b6af-cf7946362565` |
| 🧾 ADR Index                     | `3933061b-4c67-81e2-9eeb-fb20261658a7` |

### Databases

| Title                        | Data source ID (use this)              | Typical row count area                  |
| ---------------------------- | -------------------------------------- | --------------------------------------- |
| ADR Register                 | `38ded322-783b-425d-9be1-d4ba48f79c08` | ADRs 0001–0017 indexed                  |
| Engineering Maturity Items   | `e7920259-a4ed-4536-86fb-4f6ad4b0f7a1` | Maturity work items                     |
| Service Catalog              | `8b0fa5b2-0a64-4a60-8396-4d6b46c8a3b0` | Owned services                          |
| SLI/SLO Catalog              | `7e6f6678-cacf-4911-b47d-62dff0916648` | Service objectives                      |
| Runbooks                     | `445cda8a-2c46-4f74-b6a3-04b9f0092e15` | Operational runbooks                    |
| Incident Database            | `0a6b69f6-c0c2-415e-9061-5fa0818d853f` | Incidents (template row present)        |
| Architecture Inventory       | `cac4433a-d913-4a43-99de-852d162b4b4f` | Components / integrations               |
| Risk Register                | `06e3e485-24b5-4ec0-aced-0e13580e161f` | Risks                                   |
| Production Readiness Reviews | `3dc39f9b-835b-4809-853e-7b2c0986deeb` | Launch readiness (template row present) |
| Operational Dashboards       | `99b1494e-0cde-4c01-9b73-a9e774903c4b` | Dashboard links                         |

---

## Database schemas and select options

Use **exact** property names and select option labels. Wrong labels fail
`--set`. Do **not** invent option values.

Property types:

- `title` — set via `page create --title` (or title field of create)
- `select` — exact label from options list
- `rich_text` — free text string
- `url` — full URL
- `date` — `YYYY-MM-DD` (ranges `start..end` if needed)
- `people` — **skip unless** you have a Notion user id; do not invent names

### ADR Register

| Property      | Type      | Options / notes                                                                        |
| ------------- | --------- | -------------------------------------------------------------------------------------- |
| ADR           | title     | Human title of the ADR                                                                 |
| Number        | rich_text | Zero-padded e.g. `0017`                                                                |
| Area          | select    | `Architecture`, `Data`, `Security`, `Reliability`, `Observability`, `CI/CD`, `Product` |
| Status        | select    | `Proposed`, `Accepted`, `Superseded`, `Deprecated`                                     |
| Decision Date | date      | `YYYY-MM-DD`                                                                           |
| GitHub ADR    | url       | `https://github.com/Hessuew/dina/blob/main/docs/adr/<file>.md`                         |
| Linear Link   | url       | optional                                                                               |
| Summary       | rich_text | One-paragraph decision summary                                                         |
| Owner         | people    | skip unless known                                                                      |

### Engineering Maturity Items

| Property      | Type      | Options / notes                                                                                                                      |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Item          | title     | Maturity item name                                                                                                                   |
| Area          | select    | `Reliability`, `Observability`, `CI/CD`, `Security`, `Performance`, `Data`, `Operations`, `Architecture`                             |
| Phase         | select    | `1 Production fundamentals`, `2 Reliability`, `3 Safe delivery`, `4 Performance and scale`, `5 Security`, `6 Long-term architecture` |
| Priority      | select    | `P0`, `P1`, `P2`, `P3`                                                                                                               |
| Status        | select    | `Not started`, `Drafted`, `In progress`, `Implemented`, `Verified`, `Operationalized`                                                |
| Evidence Link | url       | repo path or PR URL                                                                                                                  |
| Linear Link   | url       | optional                                                                                                                             |
| Review Date   | date      | next review                                                                                                                          |
| Notes         | rich_text | status / what changed                                                                                                                |
| Owner         | people    | skip unless known                                                                                                                    |

### Service Catalog

| Property       | Type      | Options / notes                                                                               |
| -------------- | --------- | --------------------------------------------------------------------------------------------- |
| Service        | title     | Service name                                                                                  |
| Type           | select    | `Frontend/App`, `Worker/API`, `Database`, `Auth`, `External API`, `Observability`, `Delivery` |
| Criticality    | select    | `Critical`, `High`, `Medium`, `Low`                                                           |
| Runtime        | rich_text | paths / runtime note                                                                          |
| Dependencies   | rich_text | comma-separated                                                                               |
| Dashboard Link | url       | optional                                                                                      |
| Runbook Link   | url       | optional                                                                                      |
| SLO Link       | url       | optional                                                                                      |
| Notes          | rich_text | ownership / boundary notes                                                                    |
| Owner          | people    | skip unless known                                                                             |

### Architecture Inventory

| Property            | Type      | Options / notes                                                                     |
| ------------------- | --------- | ----------------------------------------------------------------------------------- |
| Component           | title     | Component name                                                                      |
| Type                | select    | `Route/API`, `Database`, `Integration`, `External service`, `Worker/job`, `Storage` |
| Status              | select    | `Planned`, `Active`, `Changing`, `Deprecated`                                       |
| Data Classification | select    | `Public`, `Internal`, `Sensitive`, `Restricted`                                     |
| Runtime             | rich_text | key paths                                                                           |
| Dependencies        | rich_text |                                                                                     |
| Source Link         | url       | GitHub tree/blob URL                                                                |
| ADR Link            | url       | related ADR                                                                         |
| Notes               | rich_text |                                                                                     |
| Owner               | people    | skip unless known                                                                   |

### SLI/SLO Catalog

| Property       | Type      | Options / notes                                                     |
| -------------- | --------- | ------------------------------------------------------------------- |
| Objective      | title     | SLO name                                                            |
| Area           | select    | `Availability`, `Latency`, `Correctness`, `Freshness`, `Durability` |
| Status         | select    | `Draft`, `Active`, `Needs data`, `Retired`                          |
| Window         | select    | `7 days`, `28 days`, `30 days`, `Quarter`                           |
| Service        | rich_text | service name                                                        |
| SLI            | rich_text | measurement definition                                              |
| Target         | rich_text | target text                                                         |
| Dashboard Link | url       | optional                                                            |
| Runbook Link   | url       | optional                                                            |
| Review Date    | date      |                                                                     |
| Notes          | rich_text |                                                                     |

### Operational Dashboards

| Property    | Type      | Options / notes                                                                                  |
| ----------- | --------- | ------------------------------------------------------------------------------------------------ |
| Dashboard   | title     | name                                                                                             |
| Tool        | select    | `Cloudflare`, `Sentry`, `Supabase`, `PostHog`, `GitHub`, `Linear`, `Other`                       |
| Area        | select    | `Availability`, `Errors`, `Performance`, `Database`, `Product analytics`, `Delivery`, `Security` |
| Status      | select    | `Missing`, `Planned`, `Active`, `Needs review`                                                   |
| Link        | url       | dashboard URL                                                                                    |
| Review Date | date      |                                                                                                  |
| Notes       | rich_text |                                                                                                  |
| Owner       | people    | skip unless known                                                                                |

### Runbooks

| Property       | Type      | Options / notes                                                           |
| -------------- | --------- | ------------------------------------------------------------------------- |
| Runbook        | title     | name                                                                      |
| Area           | select    | `Reliability`, `Observability`, `CI/CD`, `Security`, `Data`, `Operations` |
| Status         | select    | `Draft`, `Ready`, `Needs review`, `Deprecated`                            |
| Service        | rich_text |                                                                           |
| Trigger        | rich_text | when to run                                                               |
| Dashboard Link | url       | optional                                                                  |
| Linear Link    | url       | optional                                                                  |
| Last Reviewed  | date      |                                                                           |
| Notes          | rich_text |                                                                           |
| Owner          | people    | skip unless known                                                         |

### Incident Database

| Property              | Type      | Options / notes                           |
| --------------------- | --------- | ----------------------------------------- |
| Incident              | title     | short name                                |
| Severity              | select    | `SEV0`, `SEV1`, `SEV2`, `SEV3`            |
| Status                | select    | `Open`, `Mitigated`, `Reviewed`, `Closed` |
| Service               | rich_text |                                           |
| Impact                | rich_text |                                           |
| Root Cause            | rich_text | fill after analysis                       |
| Started               | date      |                                           |
| Resolved              | date      | optional                                  |
| Review Link           | url       | optional postmortem                       |
| Follow-up Linear Link | url       | optional                                  |
| Owner                 | people    | skip unless known                         |

Do **not** edit the template row
`Template - production incident review`
(`0a6b69f6…` database). Create a new row for real incidents.

### Risk Register

| Property      | Type      | Options / notes                                                             |
| ------------- | --------- | --------------------------------------------------------------------------- |
| Risk          | title     |                                                                             |
| Area          | select    | `Reliability`, `Security`, `Data`, `Delivery`, `Architecture`, `Operations` |
| Severity      | select    | `Critical`, `High`, `Medium`, `Low`                                         |
| Likelihood    | select    | `High`, `Medium`, `Low`                                                     |
| Status        | select    | `Open`, `Mitigating`, `Accepted`, `Closed`                                  |
| Mitigation    | rich_text |                                                                             |
| Evidence Link | url       | optional                                                                    |
| Linear Link   | url       | optional                                                                    |
| Review Date   | date      |                                                                             |
| Owner         | people    | skip unless known                                                           |

### Production Readiness Reviews

| Property    | Type      | Options / notes                             |
| ----------- | --------- | ------------------------------------------- |
| Review      | title     | launch name                                 |
| Status      | select    | `Draft`, `In review`, `Approved`, `Blocked` |
| Decision    | select    | `Go`, `No-go`, `Conditional`                |
| Risk Level  | select    | `High`, `Medium`, `Low`                     |
| Launch Area | rich_text | feature / route / migration                 |
| Target Date | date      |                                             |
| GitHub Link | url       | PR or plan                                  |
| Linear Link | url       | optional                                    |
| Notes       | rich_text |                                             |
| Reviewer    | people    | skip unless known                           |

Do **not** overwrite the template row
`Template - significant launch readiness`. Create a new row for a real launch.

---

## Trigger → recipe map

`bun run docs:notion-check` emits rule ids that match the recipe anchors below.
Execute **only** recipes for targets that materially changed. Skip with an
explicit reason when the signal is a false positive (e.g. touch of a plan file
with no operational status change).

| Rule id                  | When (repo signal)                                                         | Notion objects (IDs)                                                                                                                                         | Recipe                                                          |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `adr-register`           | `docs/adr/*.md`                                                            | ADR Register `38ded322-783b-425d-9be1-d4ba48f79c08`, ADR Index `3933061b-4c67-81e2-9eeb-fb20261658a7`                                                        | [recipe-adr-register](#recipe-adr-register)                     |
| `architecture-inventory` | routes/utils/component README shape                                        | Architecture Inventory `cac4433a-d913-4a43-99de-852d162b4b4f`, Service Catalog `8b0fa5b2-0a64-4a60-8396-4d6b46c8a3b0`                                        | [recipe-architecture-inventory](#recipe-architecture-inventory) |
| `data-management`        | schema / migrations / `src/db/README`                                      | Data Management page `3933061b-4c67-812f-a41a-db4edf438e25`, Architecture Inventory (same id)                                                                | [recipe-data-management](#recipe-data-management)               |
| `observability`          | telemetry / sentry / dashboards / SLO plans                                | Observability page `3933061b-4c67-8137-80ae-f1ee7c8fa9a0`, SLI/SLO `7e6f6678-cacf-4911-b47d-62dff0916648`, Dashboards `99b1494e-0cde-4c01-9b73-a9e774903c4b` | [recipe-observability](#recipe-observability)                   |
| `runbooks`               | runbook / operations docs                                                  | Runbooks `445cda8a-2c46-4f74-b6a3-04b9f0092e15`, Operations page `3933061b-4c67-81b9-b9b0-de89f73150f6`                                                      | [recipe-runbooks](#recipe-runbooks)                             |
| `incidents`              | incident / postmortem docs                                                 | Incident Database `0a6b69f6-c0c2-415e-9061-5fa0818d853f`, Incident Reviews page `3933061b-4c67-8136-84c8-ea3af120b563`                                       | [recipe-incidents](#recipe-incidents)                           |
| `risk-debt`              | risk / tech-debt docs                                                      | Risk Register `06e3e485-24b5-4ec0-aced-0e13580e161f`, Technical Debt page `3933061b-4c67-81c9-85d4-e8ecdba2eead`                                             | [recipe-risk-debt](#recipe-risk-debt)                           |
| `readiness-roadmap`      | `docs/plan/**`, readiness/launch/rollout                                   | Readiness DB `3dc39f9b-835b-4809-853e-7b2c0986deeb`, Engineering Roadmap `3933061b-4c67-81bf-9387-e4cc5de8112b`                                              | [recipe-readiness-roadmap](#recipe-readiness-roadmap)           |
| `maturity`               | rules, skills, AGENTS/CLAUDE, engineering guide, package.json, docs/notion | Maturity Items `e7920259-a4ed-4536-86fb-4f6ad4b0f7a1`, Maturity Tracking `3933061b-4c67-813b-9f21-f08be2c9dfd3`                                              | [recipe-maturity](#recipe-maturity)                             |
| `linear-integration`     | Linear workflow/docs/skills                                                | Linear Integration Model `3933061b-4c67-816c-833c-cd0284156564`                                                                                              | [recipe-linear-integration](#recipe-linear-integration)         |

---

## Shared write rules

1. Finish local implementation + verification first.
2. Run `bun run docs:notion-check` (or `--json`).
3. For each reported rule id, open the matching recipe below and execute it.
4. **Find row before create** using UUID of the database, not workspace-wide
   search:
   ```bash
   npx -y notion-axi db query <DB_ID> --where "<TitleProp>=<exact or partial title>" --full --limit 20
   ```
   Title properties: ADR=`ADR`, Item, Service, Component, Objective, Dashboard,
   Runbook, Incident, Risk, Review.
5. Prefer `page update <row_or_page_id> --set …` over create.
6. Create only when query finds no matching row:
   ```bash
   npx -y notion-axi page create --parent <DB_ID> --db --title "<name>" --set Key=Value --content "<md>"
   ```
7. Hub pages (ADR Index, Maturity Tracking, Roadmap, etc.): append a dated
   markdown section; do **not** `--replace` the whole page unless explicitly
   rewriting an index list you fully own (ADR Index rewrite is allowed when
   regenerating the full list).
8. Body append format:

   ```markdown
   ## YYYY-MM-DD <short title>

   - What changed (1–3 bullets).
   - Repo paths / PR / Linear links.
   - Evidence of verification.
   ```

9. Skip `people` properties unless you already have a Notion user UUID.
10. Final agent response must include a Notion sync line naming updated targets
    or explicit skip reasons.

CLI cheatsheet:

```bash
npx -y notion-axi whoami
npx -y notion-axi db view <DB_ID>
npx -y notion-axi db query <DB_ID> --where "Status=Accepted" --full --limit 20
npx -y notion-axi page view <PAGE_OR_ROW_ID> --full
npx -y notion-axi page update <ID> --set Status=Accepted --set "GitHub ADR=https://..." --append "## 2026-07-15 note\n..."
npx -y notion-axi page create --parent <DB_ID> --db --title "Name" --set Status=Draft --content "..."
```

---

## Recipes

### recipe-adr-register

**Trigger:** new or changed file under `docs/adr/*.md`.

**Targets:**

- DB `38ded322-783b-425d-9be1-d4ba48f79c08` (ADR Register)
- Page `3933061b-4c67-81e2-9eeb-fb20261658a7` (ADR Index)

**Steps:**

1. Read the ADR frontmatter/body for number, title, status, date, summary, area.
2. Find existing row:
   ```bash
   npx -y notion-axi db query 38ded322-783b-425d-9be1-d4ba48f79c08 \
     --where "Number=<NNNN>" --full --limit 5
   ```
   Fallback: `--where "ADR=<title fragment>"`.
3. If row exists → update:
   ```bash
   npx -y notion-axi page update <ROW_ID> \
     --set Status=Accepted \
     --set Area=Architecture \
     --set Number=0017 \
     --set "Decision Date=2026-07-15" \
     --set "GitHub ADR=https://github.com/Hessuew/dina/blob/main/docs/adr/<file>.md" \
     --set "Summary=<one paragraph>"
   ```
4. If no row → create:
   ```bash
   npx -y notion-axi page create \
     --parent 38ded322-783b-425d-9be1-d4ba48f79c08 --db \
     --title "<ADR title>" \
     --set Status=Accepted \
     --set Area=Architecture \
     --set Number=0017 \
     --set "Decision Date=2026-07-15" \
     --set "GitHub ADR=https://github.com/Hessuew/dina/blob/main/docs/adr/<file>.md" \
     --set "Summary=<one paragraph>"
   ```
5. Refresh ADR Index page: rebuild the full bullet list from
   `docs/adr/*.md` and `--replace` the page body, **or** if only one ADR
   changed, edit that line. Keep format:
   ``- `NNNN` - Title - Area - Status - YYYY-MM-DD - [url](url)``
6. Repo remains canonical; Notion only indexes.

### recipe-architecture-inventory

**Trigger:** service/component boundary changes under `src/routes/**`,
`src/utils/**`, or those directories' README files.

**Targets:**

- Architecture Inventory `cac4433a-d913-4a43-99de-852d162b4b4f`
- Service Catalog `8b0fa5b2-0a64-4a60-8396-4d6b46c8a3b0` (only when owner,
  criticality, runtime boundary, or service existence changed)

**Steps:**

1. Identify the component/service names that actually changed (not every touched
   file).
2. Query Architecture Inventory:
   ```bash
   npx -y notion-axi db query cac4433a-d913-4a43-99de-852d162b4b4f \
     --where "Component=<name or fragment>" --full --limit 10
   ```
3. Update matching row(s) with Runtime, Dependencies, Source Link, Status,
   Notes, Type, Data Classification as applicable. Status usually `Active` or
   `Changing` during a boundary move.
4. If no row and the change creates a durable boundary (new module/service),
   create a row with Type / Status / Data Classification / Source Link.
5. Mirror Service Catalog only when the change affects a named service:
   ```bash
   npx -y notion-axi db query 8b0fa5b2-0a64-4a60-8396-4d6b46c8a3b0 \
     --where "Service=<name or fragment>" --full --limit 10
   ```
   Update Criticality / Runtime / Dependencies / Notes. Create only for a new
   owned service.
6. Skip Service Catalog if ownership/SLOs did not change — say so in final
   response.

### recipe-data-management

**Trigger:** `src/db/schema*`, `src/db/README.md`, `src/db/migrations/**`.

**Targets:**

- Page Data Management `3933061b-4c67-812f-a41a-db4edf438e25`
- Architecture Inventory rows for schema/migrations
  (`Database schema and migrations` /
  `Drizzle schema and migrations` / similar)

**Steps:**

1. Append a dated note on Data Management summarizing schema/migration impact:
   ```bash
   npx -y notion-axi page update 3933061b-4c67-812f-a41a-db4edf438e25 \
     --append "## YYYY-MM-DD Schema update\n- …\n- Repo: src/db/…\n"
   ```
2. Query Architecture Inventory for database components and update Runtime /
   Notes / Source Link / Status (`Changing` then back to `Active` if done).
3. Do not invent a second database of record.

### recipe-observability

**Trigger:** observability / SLO / dashboard / Sentry / PostHog / Cloudflare /
Supabase ops docs or instrumentation.

**Targets:**

- Page Observability `3933061b-4c67-8137-80ae-f1ee7c8fa9a0`
- SLI/SLO Catalog `7e6f6678-cacf-4911-b47d-62dff0916648`
- Operational Dashboards `99b1494e-0cde-4c01-9b73-a9e774903c4b`
- Related Architecture Inventory / Service Catalog rows for Sentry, PostHog,
  Cloudflare when instrumentation status changed

**Steps:**

1. Append dated summary to Observability hub page (status of signals, gaps).
2. For concrete SLOs: query by Objective title; update Status/Target/SLI/
   Dashboard Link/Review Date or create if new.
3. For dashboards: query Operational Dashboards by title/tool; set Status and
   Link when a real URL exists (`Active`), else keep `Planned`/`Missing`.
4. Existing dashboard rows include Sentry / PostHog / Supabase / GitHub /
   Cloudflare — update those before creating duplicates.

### recipe-runbooks

**Trigger:** runbook or operations documentation changes.

**Targets:**

- Runbooks DB `445cda8a-2c46-4f74-b6a3-04b9f0092e15`
- Operations and Runbooks page `3933061b-4c67-81b9-b9b0-de89f73150f6`

**Steps:**

1. Query Runbooks by title:
   ```bash
   npx -y notion-axi db query 445cda8a-2c46-4f74-b6a3-04b9f0092e15 \
     --where "Runbook=<name>" --full --limit 10
   ```
2. Update Trigger / Status / Service / Notes / Last Reviewed / Dashboard Link.
   Status: `Draft` → `Ready` when operationalized.
3. Create only for a net-new runbook topic.
4. Append a short dated changelog on Operations and Runbooks page.

### recipe-incidents

**Trigger:** incident or postmortem material.

**Targets:**

- Incident Database `0a6b69f6-c0c2-415e-9061-5fa0818d853f`
- Incident Reviews page `3933061b-4c67-8136-84c8-ea3af120b563`

**Steps:**

1. Never edit template row `Template - production incident review`.
2. Query for the incident title; create if missing with Severity/Status/Service/
   Started/Impact.
3. On postmortem: set Status=`Reviewed` or `Closed`, fill Root Cause, Resolved,
   Review Link, Follow-up Linear Link.
4. Append summary on Incident Reviews hub page.
5. Link follow-up work in Linear; Notion stores the link, not the task board.

### recipe-risk-debt

**Trigger:** risk or technical-debt docs.

**Targets:**

- Risk Register `06e3e485-24b5-4ec0-aced-0e13580e161f`
- Technical Debt Register page `3933061b-4c67-81c9-85d4-e8ecdba2eead`

**Steps:**

1. For risks: query Risk Register by Risk title; update Severity/Likelihood/
   Status/Mitigation/Evidence Link/Review Date or create.
2. For debt without a formal risk row: append a structured entry to Technical
   Debt Register page body using the page template (Title, Area, Impact, Risk
   if ignored, Proposed fix, Linear link, Target phase).
3. Prefer Risk Register when the item is a production risk; prefer Technical
   Debt page for maintainability debt.

### recipe-readiness-roadmap

**Trigger:** `docs/plan/**` or readiness/launch/rollout signals.

**Targets:**

- Production Readiness Reviews `3dc39f9b-835b-4809-853e-7b2c0986deeb`
- Engineering Roadmap page `3933061b-4c67-81bf-9387-e4cc5de8112b`

**Steps:**

1. Never edit template row `Template - significant launch readiness` as the
   live review — create a new Review row for a real launch.
2. Update Status/Risk Level/Decision/Launch Area/Target Date/GitHub Link/Notes.
3. Append a dated roadmap note only when phase status or core work list
   changed (not for every plan file touch).
4. Skip roadmap append for pure plan-doc wording with no maturity/phase effect;
   state skip reason.

### recipe-maturity

**Trigger:** `docs/rules/**`, `docs/skills/**`, `docs/notion/**`,
`docs/ENGINEERING_GUIDE.md`, `docs/TESTING_GUIDE.md`, `docs/DEFAULT_MODES.md`,
`AGENTS.md`, `CLAUDE.md`, `package.json`.

**Targets:**

- Engineering Maturity Items `e7920259-a4ed-4536-86fb-4f6ad4b0f7a1`
- Maturity Tracking page `3933061b-4c67-813b-9f21-f08be2c9dfd3`

**Steps:**

1. Decide the maturity item name (existing preferred). Query:
   ```bash
   npx -y notion-axi db query e7920259-a4ed-4536-86fb-4f6ad4b0f7a1 \
     --where "Item=<fragment>" --full --limit 10
   ```
2. Update Status / Phase / Priority / Notes / Evidence Link / Review Date.
   Example Status progression: `Drafted` → `Implemented` → `Verified` →
   `Operationalized`.
3. Create only for a net-new durable engineering-system capability.
4. Append a short dated note on Maturity Tracking describing the operating
   contract change.
5. If this task only refines the Notion sync skill/map itself, update the
   existing item **Operationalize repo-to-Notion engineering sync**
   (`3933061b-4c67-817c-a870-ebb1db510e78`) Notes + Evidence Link rather than
   creating a sibling.

### recipe-linear-integration

**Trigger:** Linear workflow / linking / axi skill or scripts.

**Targets:**

- Page Linear Integration Model `3933061b-4c67-816c-833c-cd0284156564`

**Steps:**

1. Append a dated section describing the model change (linking rules, CLI,
   skill paths). Do not dump skill source into Notion.
2. Keep Linear itself as the execution tracker; Notion only describes the model.

---

## When to skip

Skip a target and name the reason when:

- Check fired on a path but the task did not materially change that target's
  meaning (e.g. typo in plan doc → no Roadmap update).
- notion-axi / `ntn` unavailable after install/login attempt.
- Change is pure code with no ownership, ops, maturity, or ADR impact (check
  should already return empty).

---

## Agent final response

```text
Notion sync: updated ADR Register (0017) and ADR Index. Skipped Service Catalog
because ownership/SLOs did not change.
```

If the connector is unavailable, include:

- `bun run docs:notion-check` output
- target names + IDs from this map
- exact repo paths
- why Notion could not be written

---

## Refreshing this inventory

When Notion structure changes (new DB, renamed select option, moved page):

1. `npx -y notion-axi whoami` to confirm workspace.
2. `npx -y notion-axi search "<name>" --fields url` and
   `npx -y notion-axi db view <id>` / `api GET /v1/data_sources/<id>` for
   select options.
3. Update **this file** in the same PR as the tooling change.
4. Keep `scripts/notion-check.domain.mjs` IDs in lockstep with the tables above.
   )
