import { describe, expect, it } from 'vitest'

import {
  detectNotionSyncTargets,
  formatNotionSyncReport,
} from './notion-check.domain.mjs'

describe('detectNotionSyncTargets', () => {
  it('detects ADR register updates for ADR files with stable IDs', () => {
    const matches = detectNotionSyncTargets(['docs/adr/0017-example.md'])

    expect(matches).toMatchObject([
      {
        id: 'adr-register',
        recipe: 'recipe-adr-register',
        map: 'docs/notion/README.md',
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
      },
    ])
  })

  it('detects database and architecture targets for schema work', () => {
    const matches = detectNotionSyncTargets(['src/db/schema.ts'])

    expect(matches.map((match) => match.id)).toContain('data-management')
    const data = matches.find((match) => match.id === 'data-management')
    expect(data?.targets.some((target) => target.kind === 'page')).toBe(true)
    expect(data?.recipe).toBe('recipe-data-management')
  })

  it('detects observability and readiness targets for observability plans', () => {
    const matches = detectNotionSyncTargets(['docs/plan/OBSERVABILITY.md'])

    expect(matches.map((match) => match.id)).toEqual(
      expect.arrayContaining(['observability', 'readiness-roadmap']),
    )
    const obs = matches.find((match) => match.id === 'observability')
    expect(obs?.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Operational Dashboards',
          id: '99b1494e-0cde-4c01-9b73-a9e774903c4b',
        }),
      ]),
    )
  })

  it('detects maturity updates for binding rules', () => {
    const matches = detectNotionSyncTargets([
      'docs/rules/notion-sync.md',
      'docs/notion/README.md',
      'AGENTS.md',
    ])

    expect(matches.map((match) => match.id)).toContain('maturity')
    const maturity = matches.find((match) => match.id === 'maturity')
    expect(maturity?.targets.map((target) => target.id)).toEqual([
      'e7920259-a4ed-4536-86fb-4f6ad4b0f7a1',
      '3933061b-4c67-813b-9f21-f08be2c9dfd3',
    ])
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

  it('formats detected targets with UUIDs, recipe pointers, and files', () => {
    const report = formatNotionSyncReport(
      detectNotionSyncTargets(['docs/adr/0017-example.md']),
    )

    expect(report).toContain('ADR Register')
    expect(report).toContain('docs/adr/0017-example.md')
    expect(report).toContain('38ded322-783b-425d-9be1-d4ba48f79c08')
    expect(report).toContain('docs/notion/README.md#recipe-adr-register')
    expect(report).toContain('final response')
  })
})
