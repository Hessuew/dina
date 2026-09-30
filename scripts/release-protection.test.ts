import { describe, expect, it } from 'vitest'

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { hasImmutableReleaseTagRuleset } =
  require('./release-protection.cjs') as {
    hasImmutableReleaseTagRuleset: (rulesets: unknown) => boolean
  }

const immutableRuleset = {
  target: 'tag',
  enforcement: 'active',
  conditions: { ref_name: { include: ['refs/tags/v*'] } },
  rules: [{ type: 'deletion' }, { type: 'update' }],
}

describe('hasImmutableReleaseTagRuleset', () => {
  it('accepts an active v* tag ruleset with deletion and update protection', () => {
    expect(hasImmutableReleaseTagRuleset([immutableRuleset])).toBe(true)
  })

  it('rejects inactive or unrelated rulesets', () => {
    expect(
      hasImmutableReleaseTagRuleset([
        { ...immutableRuleset, enforcement: 'evaluate' },
        { ...immutableRuleset, target: 'branch' },
        {
          ...immutableRuleset,
          conditions: { ref_name: { include: ['refs/tags/canary*'] } },
        },
      ]),
    ).toBe(false)
  })

  it('rejects v* rulesets missing either immutability rule', () => {
    expect(
      hasImmutableReleaseTagRuleset([
        { ...immutableRuleset, rules: [{ type: 'deletion' }] },
      ]),
    ).toBe(false)
  })
})
