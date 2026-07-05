import { describe, expect, it } from 'vitest'

import {
  detectNotionSyncTargets,
  formatNotionSyncReport,
} from './notion-check.domain.mjs'

describe('detectNotionSyncTargets', () => {
  it('detects ADR register updates for ADR files', () => {
    expect(detectNotionSyncTargets(['docs/adr/0017-example.md'])).toMatchObject(
      [
        {
          id: 'adr-register',
          targets: ['ADR Register', '🧾 ADR Index'],
        },
      ],
    )
  })

  it('detects database and architecture targets for schema work', () => {
    const matches = detectNotionSyncTargets(['src/db/schema.ts'])

    expect(matches.map((match) => match.id)).toContain('data-management')
  })

  it('detects observability and readiness targets for observability plans', () => {
    const matches = detectNotionSyncTargets(['docs/plan/OBSERVABILITY.md'])

    expect(matches.map((match) => match.id)).toEqual(
      expect.arrayContaining(['observability', 'readiness-roadmap']),
    )
  })

  it('detects maturity updates for binding rules', () => {
    const matches = detectNotionSyncTargets([
      'docs/rules/notion-sync.md',
      'docs/notion/README.md',
      'AGENTS.md',
    ])

    expect(matches.map((match) => match.id)).toContain('maturity')
  })

  it('returns no matches for ordinary app files without architecture signals', () => {
    expect(detectNotionSyncTargets(['src/components/Button.tsx'])).toEqual([])
  })
})

describe('formatNotionSyncReport', () => {
  it('formats an empty report', () => {
    expect(formatNotionSyncReport([])).toContain(
      'No Notion sync triggers detected.',
    )
  })

  it('formats detected targets with files and final instruction', () => {
    const report = formatNotionSyncReport(
      detectNotionSyncTargets(['docs/adr/0017-example.md']),
    )

    expect(report).toContain('ADR Register')
    expect(report).toContain('docs/adr/0017-example.md')
    expect(report).toContain('final response')
  })
})
