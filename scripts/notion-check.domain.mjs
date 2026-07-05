const rules = [
  {
    id: 'adr-register',
    title: 'ADR Register / ADR Index',
    targets: ['ADR Register', '🧾 ADR Index'],
    reason: 'ADR files changed; Notion must index canonical repo ADRs.',
    matches: (file) => /^docs\/adr\/[^/]+\.md$/u.test(file),
  },
  {
    id: 'architecture-inventory',
    title: 'Architecture Inventory / Service Catalog',
    targets: ['Architecture Inventory', 'Service Catalog'],
    reason:
      'Service, API, route, utility, or integration shape may have changed.',
    matches: (file) =>
      /^src\/(?:routes|utils)\//u.test(file) ||
      /^src\/components\/README\.md$/u.test(file) ||
      /^src\/utils\/README\.md$/u.test(file) ||
      /^src\/routes\/README\.md$/u.test(file),
  },
  {
    id: 'data-management',
    title: 'Data Management / Architecture Inventory',
    targets: ['🗄️ Data Management', 'Architecture Inventory'],
    reason: 'Database schema or migration files changed.',
    matches: (file) =>
      /^src\/db\/(?:schema|README)\.ts$/u.test(file) ||
      /^src\/db\/README\.md$/u.test(file) ||
      /^src\/db\/migrations\//u.test(file),
  },
  {
    id: 'observability',
    title: 'Observability / SLI-SLO / Dashboards',
    targets: ['🔭 Observability', 'SLI/SLO Catalog', 'Operational Dashboards'],
    reason: 'Telemetry, SLO, dashboard, or observability planning changed.',
    matches: (file) =>
      /(?:^|\/)(?:observability|slo|sli|dashboard)/iu.test(file) ||
      /sentry|posthog|cloudflare|supabase/iu.test(file),
  },
  {
    id: 'runbooks',
    title: 'Runbooks / Operations',
    targets: ['Runbooks', '🧰 Operations and Runbooks'],
    reason: 'Runbook or operations documentation changed.',
    matches: (file) => /(?:^|\/)(?:runbook|operations?)/iu.test(file),
  },
  {
    id: 'incidents',
    title: 'Incident Database / Incident Reviews',
    targets: ['Incident Database', '🚨 Incident Reviews'],
    reason: 'Incident or postmortem material changed.',
    matches: (file) => /(?:incident|postmortem)/iu.test(file),
  },
  {
    id: 'risk-debt',
    title: 'Risk Register / Technical Debt Register',
    targets: ['Risk Register', '📉 Technical Debt Register'],
    reason: 'Risk or technical debt material changed.',
    matches: (file) =>
      /(?:risk|technical-debt|tech-debt|debt-register)/iu.test(file),
  },
  {
    id: 'readiness-roadmap',
    title: 'Production Readiness / Roadmap',
    targets: ['Production Readiness Reviews', '🗺️ Engineering Roadmap'],
    reason: 'Launch, rollout, or planning document changed.',
    matches: (file) =>
      /^docs\/plan\//u.test(file) || /readiness|launch|rollout/iu.test(file),
  },
  {
    id: 'maturity',
    title: 'Engineering Maturity / Maturity Tracking',
    targets: ['Engineering Maturity Items', '📊 Maturity Tracking'],
    reason: 'Engineering system rules, guide, tests, or maturity docs changed.',
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
    targets: ['🔗 Linear Integration Model'],
    reason: 'Linear integration workflow changed.',
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
      'If this task changed roadmap, ownership, incidents, risks, readiness, or operational status outside tracked files, update Notion manually.',
    ].join('\n')
  }

  const lines = [
    'Notion sync targets detected:',
    '',
    ...matches.flatMap((match) => [
      `- ${match.title}`,
      `  Targets: ${match.targets.join(', ')}`,
      `  Reason: ${match.reason}`,
      `  Files: ${unique(match.files).join(', ')}`,
    ]),
    '',
    'Update these Notion records after verification, then mention the updates in the final response.',
  ]

  return lines.join('\n')
}
