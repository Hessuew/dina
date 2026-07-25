import { describe, expect, it } from 'vitest'

import {
  isDocsOnlyDiff,
  normalizeChangedPaths,
  planVerification,
  resolveQualityBase,
} from './quality-verification.domain.mjs'

type PlannedCheck = {
  id: string
  skip?: boolean
  files?: Array<string>
}

type VerificationPlan = {
  checks: Array<PlannedCheck>
  docsOnly: boolean
  existingFiles: Array<string>
}

function plan(
  mode: 'static' | 'test' | 'gate' | 'release',
  paths: Array<string>,
): VerificationPlan {
  return planVerification({
    mode,
    changedPaths: paths,
    existingFiles: paths.filter((path) => !path.includes('deleted')),
  }) as VerificationPlan
}

describe('resolveQualityBase', () => {
  it('defaults to origin/main', () => {
    expect(resolveQualityBase(undefined)).toBe('origin/main')
    expect(resolveQualityBase('  ')).toBe('origin/main')
  })

  it('keeps an explicit base', () => {
    expect(resolveQualityBase('abc123')).toBe('abc123')
  })
})

describe('diff classification', () => {
  it('recognizes only narrow documentation paths as docs-only', () => {
    expect(
      isDocsOnlyDiff([
        'docs/TESTING_GUIDE.md',
        'AGENTS.md',
        '.github/PULL_REQUEST_TEMPLATE.md',
      ]),
    ).toBe(true)
  })

  it.each([
    ['nested markdown', 'src/README.md'],
    ['workflow', '.github/workflows/quality-gate.yml'],
    ['configuration', 'package.json'],
    ['deleted source', 'src/utils/deleted.ts'],
  ])('fails safe for %s', (_label, path) => {
    expect(isDocsOnlyDiff([path])).toBe(false)
  })

  it('deduplicates and sorts changed paths', () => {
    expect(normalizeChangedPaths(['z.ts', 'a.ts', 'z.ts'])).toEqual([
      'a.ts',
      'z.ts',
    ])
  })
})

describe('planVerification', () => {
  it('plans changed-file static checks and Fallow for governed paths', () => {
    const result = plan('static', ['src/utils/a.ts', 'docs/a.md'])
    expect(result.checks.map((check) => check.id)).toEqual([
      'format',
      'lint',
      'fallow',
    ])
    expect(result.checks.find((check) => check.id === 'lint')?.files).toEqual([
      'src/utils/a.ts',
    ])
    expect(result.checks.find((check) => check.id === 'fallow')?.skip).toBe(
      false,
    )
  })

  it('skips full test safety only for docs-only changes', () => {
    expect(
      plan('test', ['docs/a.md']).checks.every((check) => check.skip),
    ).toBe(true)
    expect(
      plan('test', ['package.json']).checks.every((check) => !check.skip),
    ).toBe(true)
  })

  it('keeps deleted source paths for classification but not file checks', () => {
    const result = plan('gate', ['src/utils/deleted.ts'])
    expect(result.docsOnly).toBe(false)
    expect(result.existingFiles).toEqual([])
    expect(result.checks.find((check) => check.id === 'fallow')?.skip).toBe(
      false,
    )
    expect(result.checks.find((check) => check.id === 'unit')?.skip).toBe(false)
  })

  it('adds integration and build only in release mode', () => {
    const gateIds = plan('gate', ['package.json']).checks.map(
      (check) => check.id,
    )
    const releaseIds = plan('release', ['package.json']).checks.map(
      (check) => check.id,
    )
    expect(gateIds).not.toContain('integration')
    expect(gateIds).not.toContain('build')
    expect(releaseIds.slice(-2)).toEqual(['integration', 'build'])
    expect(new Set(releaseIds).size).toBe(releaseIds.length)
  })
})
