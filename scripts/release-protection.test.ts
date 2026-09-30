import { describe, expect, it } from 'vitest'
import {
  hasImmutableReleaseTagRuleset,
  normalizeRulesetDetails,
} from './release-protection.cjs'

const immutableRuleset = {
  bypass_actors: [],
  target: 'tag',
  enforcement: 'active',
  conditions: { ref_name: { exclude: [], include: ['refs/tags/v*'] } },
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

  it('rejects v* rulesets with exclusions', () => {
    expect(
      hasImmutableReleaseTagRuleset([
        {
          ...immutableRuleset,
          conditions: {
            ref_name: {
              exclude: ['refs/tags/v2026.*'],
              include: ['refs/tags/v*'],
            },
          },
        },
      ]),
    ).toBe(false)
  })

  it('rejects missing or non-empty bypass actor metadata', () => {
    expect(
      hasImmutableReleaseTagRuleset([
        { ...immutableRuleset, bypass_actors: undefined },
      ]),
    ).toBe(false)

    for (const actor_type of [
      'OrganizationAdmin',
      'Team',
      'User',
      'Integration',
    ]) {
      expect(
        hasImmutableReleaseTagRuleset([
          {
            ...immutableRuleset,
            bypass_actors: [{ actor_id: 1, actor_type }],
          },
        ]),
      ).toBe(false)
    }
  })

  it('does not accept summary-only ruleset metadata', () => {
    const summaries = [
      { enforcement: 'active', id: 42, name: 'DINA immutable production tags' },
    ]

    expect(hasImmutableReleaseTagRuleset(summaries)).toBe(false)
    expect(normalizeRulesetDetails(summaries, [])).toEqual([])
  })

  it('normalizes detailed ruleset responses by summary id', () => {
    const summaries = [{ enforcement: 'active', id: 42 }]
    const details = [{ data: { ...immutableRuleset, id: 42 } }]
    const normalized = normalizeRulesetDetails(summaries, details)

    expect(normalized).toEqual(details.map(({ data }) => data))
    expect(hasImmutableReleaseTagRuleset(normalized)).toBe(true)
  })

  it('rejects details that do not match a listed ruleset id', () => {
    expect(
      normalizeRulesetDetails(
        [{ id: 42 }],
        [{ data: { ...immutableRuleset, id: 43 } }],
      ),
    ).toEqual([])
  })
})
