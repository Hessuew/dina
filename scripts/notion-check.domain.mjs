const NOTION_MAP = 'docs/notion/README.md'

/**
 * Stable Notion object map for agent execution.
 * Keep in lockstep with docs/notion/README.md inventory tables.
 * `id` fields are data_source IDs for databases (what notion-axi accepts)
 * or page IDs for hub pages.
 */
const rules = [
  {
    id: 'adr-register',
    title: 'ADR Register / ADR Index',
    recipe: 'recipe-adr-register',
    reason: 'ADR files changed; Notion must index canonical repo ADRs.',
    targets: [
      {
        name: 'ADR Register',
        kind: 'database',
        id: '38ded322-783b-425d-9be1-d4ba48f79c08',
      },
      {
        name: '🧾 ADR Index',
        kind: 'page',
        id: '3933061b-4c67-81e2-9eeb-fb20261658a7',
      },
    ],
    matches: (file) => /^docs\/adr\/[^/]+\.md$/u.test(file),
  },
  {
    id: 'architecture-inventory',
    title: 'Architecture Inventory / Service Catalog',
    recipe: 'recipe-architecture-inventory',
    reason:
      'Service, API, route, utility, or integration shape may have changed.',
    targets: [
      {
        name: 'Architecture Inventory',
        kind: 'database',
        id: 'cac4433a-d913-4a43-99de-852d162b4b4f',
      },
      {
        name: 'Service Catalog',
        kind: 'database',
        id: '8b0fa5b2-0a64-4a60-8396-4d6b46c8a3b0',
      },
    ],
    matches: (file) =>
      /^src\/(?:routes|utils)\//u.test(file) ||
      /^src\/components\/README\.md$/u.test(file) ||
      /^src\/utils\/README\.md$/u.test(file) ||
      /^src\/routes\/README\.md$/u.test(file),
  },
  {
    id: 'data-management',
    title: 'Data Management / Architecture Inventory',
    recipe: 'recipe-data-management',
    reason: 'Database schema or migration files changed.',
    targets: [
      {
        name: '🗄️ Data Management',
        kind: 'page',
        id: '3933061b-4c67-812f-a41a-db4edf438e25',
      },
      {
        name: 'Architecture Inventory',
        kind: 'database',
        id: 'cac4433a-d913-4a43-99de-852d162b4b4f',
      },
    ],
    matches: (file) =>
      /^src\/db\/(?:schema|README)\.ts$/u.test(file) ||
      /^src\/db\/README\.md$/u.test(file) ||
      /^src\/db\/migrations\//u.test(file),
  },
  {
    id: 'observability',
    title: 'Observability / SLI-SLO / Dashboards',
    recipe: 'recipe-observability',
    reason: 'Telemetry, SLO, dashboard, or observability planning changed.',
    targets: [
      {
        name: '🔭 Observability',
        kind: 'page',
        id: '3933061b-4c67-8137-80ae-f1ee7c8fa9a0',
      },
      {
        name: 'SLI/SLO Catalog',
        kind: 'database',
        id: '7e6f6678-cacf-4911-b47d-62dff0916648',
      },
      {
        name: 'Operational Dashboards',
        kind: 'database',
        id: '99b1494e-0cde-4c01-9b73-a9e774903c4b',
      },
    ],
    matches: (file) =>
      /(?:^|\/)(?:observability|slo|sli|dashboard)/iu.test(file) ||
      /sentry|posthog|cloudflare|supabase/iu.test(file),
  },
  {
    id: 'runbooks',
    title: 'Runbooks / Operations',
    recipe: 'recipe-runbooks',
    reason: 'Runbook or operations documentation changed.',
    targets: [
      {
        name: 'Runbooks',
        kind: 'database',
        id: '445cda8a-2c46-4f74-b6a3-04b9f0092e15',
      },
      {
        name: '🧰 Operations and Runbooks',
        kind: 'page',
        id: '3933061b-4c67-81b9-b9b0-de89f73150f6',
      },
    ],
    matches: (file) => /(?:^|\/)(?:runbook|operations?)/iu.test(file),
  },
  {
    id: 'incidents',
    title: 'Incident Database / Incident Reviews',
    recipe: 'recipe-incidents',
    reason: 'Incident or postmortem material changed.',
    targets: [
      {
        name: 'Incident Database',
        kind: 'database',
        id: '0a6b69f6-c0c2-415e-9061-5fa0818d853f',
      },
      {
        name: '🚨 Incident Reviews',
        kind: 'page',
        id: '3933061b-4c67-8136-84c8-ea3af120b563',
      },
    ],
    matches: (file) => /(?:incident|postmortem)/iu.test(file),
  },
  {
    id: 'risk-debt',
    title: 'Risk Register / Technical Debt Register',
    recipe: 'recipe-risk-debt',
    reason: 'Risk or technical debt material changed.',
    targets: [
      {
        name: 'Risk Register',
        kind: 'database',
        id: '06e3e485-24b5-4ec0-aced-0e13580e161f',
      },
      {
        name: '📉 Technical Debt Register',
        kind: 'page',
        id: '3933061b-4c67-81c9-85d4-e8ecdba2eead',
      },
    ],
    matches: (file) =>
      /(?:risk|technical-debt|tech-debt|debt-register)/iu.test(file),
  },
  {
    id: 'readiness-roadmap',
    title: 'Production Readiness / Roadmap',
    recipe: 'recipe-readiness-roadmap',
    reason: 'Launch, rollout, or planning document changed.',
    targets: [
      {
        name: 'Production Readiness Reviews',
        kind: 'database',
        id: '3dc39f9b-835b-4809-853e-7b2c0986deeb',
      },
      {
        name: '🗺️ Engineering Roadmap',
        kind: 'page',
        id: '3933061b-4c67-81bf-9387-e4cc5de8112b',
      },
    ],
    matches: (file) =>
      /^docs\/plan\//u.test(file) || /readiness|launch|rollout/iu.test(file),
  },
  {
    id: 'maturity',
    title: 'Engineering Maturity / Maturity Tracking',
    recipe: 'recipe-maturity',
    reason: 'Engineering system rules, guide, tests, or maturity docs changed.',
    targets: [
      {
        name: 'Engineering Maturity Items',
        kind: 'database',
        id: 'e7920259-a4ed-4536-86fb-4f6ad4b0f7a1',
      },
      {
        name: '📊 Maturity Tracking',
        kind: 'page',
        id: '3933061b-4c67-813b-9f21-f08be2c9dfd3',
      },
    ],
    matches: (file) =>
      /^docs\/rules\//u.test(file) ||
      /^docs\/notion\//u.test(file) ||
      file === 'docs/ENGINEERING_GUIDE.md' ||
      file === 'docs/TESTING_GUIDE.md' ||
      file === 'docs/DEFAULT_MODES.md' ||
      /^docs\/skills\//u.test(file) ||
      file === 'AGENTS.md' ||
      file === 'CLAUDE.md' ||
      file === 'package.json',
  },
  {
    id: 'linear-integration',
    title: 'Linear Integration Model',
    recipe: 'recipe-linear-integration',
    reason: 'Linear integration workflow changed.',
    targets: [
      {
        name: '🔗 Linear Integration Model',
        kind: 'page',
        id: '3933061b-4c67-816c-833c-cd0284156564',
      },
    ],
    matches: (file) => /linear/iu.test(file),
  },
]

function unique(values) {
  return [...new Set(values)]
}

export function detectNotionSyncTargets(files) {
  return rules
    .map((rule) => ({
      id: rule.id,
      title: rule.title,
      recipe: rule.recipe,
      map: NOTION_MAP,
      targets: rule.targets,
      reason: rule.reason,
      files: files.filter((file) => rule.matches(file)),
    }))
    .filter((match) => match.files.length > 0)
}

export function formatNotionSyncReport(matches) {
  if (matches.length === 0) {
    return [
      'No Notion sync triggers detected.',
      'If this task changed roadmap, ownership, incidents, risks, readiness, or operational status outside tracked files, update Notion manually using docs/notion/README.md.',
    ].join('\n')
  }

  const lines = [
    'Notion sync targets detected:',
    '',
    ...matches.flatMap((match) => [
      `- ${match.title} [${match.id}]`,
      `  Recipe: ${NOTION_MAP}#${match.recipe}`,
      `  Reason: ${match.reason}`,
      `  Files: ${unique(match.files).join(', ')}`,
      `  Targets:`,
      ...match.targets.map(
        (target) => `    - ${target.kind} ${target.name} \`${target.id}\``,
      ),
    ]),
    '',
    `Open each Recipe section in ${NOTION_MAP} and execute it with the UUIDs above (prefer db query + page update; create only when recipe allows and no row exists).`,
    'Then mention the updates (or skip reasons) in the final response.',
  ]

  return lines.join('\n')
}
