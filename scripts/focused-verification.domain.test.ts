import { describe, expect, it } from 'vitest'

import {
  planFocusedVerification,
  resolveQualityBase,
} from './focused-verification.domain.mjs'

describe('resolveQualityBase', () => {
  it('uses origin/main as the safe worktree default', () => {
    expect(resolveQualityBase(undefined)).toBe('origin/main')
    expect(resolveQualityBase('')).toBe('origin/main')
  })

  it('uses an explicit comparison base', () => {
    expect(resolveQualityBase('base-commit')).toBe('base-commit')
  })
})

describe('planFocusedVerification', () => {
  it('plans no tests for documentation-only changes', () => {
    const plan = planFocusedVerification(['docs/TESTING_GUIDE.md'])

    expect(plan.unitRelatedFiles).toEqual([])
    expect(plan.integrationRelatedFiles).toEqual([])
    expect(plan.fullIntegration).toBe(false)
  })

  it('plans only related unit tests for script changes', () => {
    const plan = planFocusedVerification(['scripts/quality-files.mjs'])

    expect(plan.unitRelatedFiles).toEqual(['scripts/quality-files.mjs'])
    expect(plan.integrationRelatedFiles).toEqual([])
    expect(plan.fullIntegration).toBe(false)
  })

  it('plans related unit and integration coverage for source changes', () => {
    const plan = planFocusedVerification(['src/utils/auth/domain/login.ts'])

    expect(plan.unitRelatedFiles).toEqual(['src/utils/auth/domain/login.ts'])
    expect(plan.integrationRelatedFiles).toEqual([
      'src/utils/auth/domain/login.ts',
    ])
    expect(plan.fallowApplicable).toBe(true)
  })

  it('keeps integration tests out of the unit-related invocation', () => {
    const file = 'src/utils/signup/signup.integration.test.ts'
    const plan = planFocusedVerification([file])

    expect(plan.unitRelatedFiles).toEqual([])
    expect(plan.integrationRelatedFiles).toEqual([file])
    expect(plan.fullIntegration).toBe(false)
  })

  it.each([
    'drizzle/0042_add_index.sql',
    'src/db/schema.ts',
    'test/integration/setup.ts',
    'vitest.integration.config.ts',
    'package.json',
    'bun.lock',
  ])('escalates %s to the full integration suite', (file) => {
    const plan = planFocusedVerification([file])

    expect(plan.fullIntegration).toBe(true)
    expect(plan.integrationRelatedFiles).toEqual([])
  })
})
