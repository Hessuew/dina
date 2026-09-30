import { describe, expect, it } from 'vitest'

import {
  createReleaseTag,
  evaluateGuardrails,
  parseVersionMetrics,
  selectRolloutPlan,
  validateTargetSha,
} from './release-policy.domain'

describe('createReleaseTag', () => {
  it('increments the dated sequence across successful and failed tags', () => {
    expect(
      createReleaseTag('2026.09.29', [
        'v2026.09.29.1',
        'v2026.09.29.3',
        'v2026.09.28.9',
        'not-a-release-tag',
      ]),
    ).toBe('v2026.09.29.4')
  })

  it('starts a new sequence for a date without existing tags', () => {
    expect(createReleaseTag('2026.09.30', [])).toBe('v2026.09.30.1')
  })
})

describe('validateTargetSha', () => {
  it('accepts and normalizes a full commit SHA', () => {
    expect(
      validateTargetSha(' ABCDEF0123456789ABCDEF0123456789ABCDEF01 '),
    ).toBe('abcdef0123456789abcdef0123456789abcdef01')
  })

  it('rejects abbreviated or malformed SHAs', () => {
    expect(() => validateTargetSha('abc123')).toThrow(/full 40-character/u)
  })
})

describe('selectRolloutPlan', () => {
  it('selects direct promotion for the standard profile', () => {
    expect(selectRolloutPlan('standard')).toEqual({
      mode: 'direct',
      reason: 'standard',
      percentages: [100],
    })
  })

  it('selects all gradual stages when the sample floor is met', () => {
    expect(selectRolloutPlan('gradual', 20)).toEqual({
      mode: 'gradual',
      reason: 'requested',
      percentages: [10, 25, 50, 100],
    })
  })

  it('falls back to direct promotion below the sample floor', () => {
    expect(selectRolloutPlan('gradual', 19)).toEqual({
      mode: 'direct',
      reason: 'low-traffic',
      percentages: [100],
    })
  })

  it('applies the sample floor to fractional request counts', () => {
    expect(selectRolloutPlan('gradual', 19.5)).toEqual({
      mode: 'direct',
      reason: 'low-traffic',
      percentages: [100],
    })
  })
})

describe('evaluateGuardrails', () => {
  it('passes healthy metrics', () => {
    expect(
      evaluateGuardrails({
        requests: 100,
        errors: 5,
        p95LatencyMs: 1000,
        highSeverityIssues: 0,
      }),
    ).toMatchObject({ passed: true, errorRate: 0.05, failures: [] })
  })

  it('fails every release rollback guardrail that is exceeded', () => {
    expect(
      evaluateGuardrails({
        requests: 100,
        errors: 6,
        p95LatencyMs: 1001,
        highSeverityIssues: 1,
      }),
    ).toMatchObject({
      passed: false,
      failures: [
        'error rate 6.00% exceeds 5%',
        'p95 latency 1001ms exceeds 1000ms',
        '1 new high-severity release-correlated issue(s) detected',
      ],
    })
  })
})

describe('parseVersionMetrics', () => {
  it('accepts a version metrics response or a nested metrics response', () => {
    expect(
      parseVersionMetrics({
        metrics: {
          requests: 21,
          errors: 1,
          p95LatencyMs: 500,
          highSeverityIssues: 0,
        },
      }),
    ).toEqual({
      requests: 21,
      errors: 1,
      p95LatencyMs: 500,
      highSeverityIssues: 0,
    })
  })

  it('rejects metrics that cannot safely drive a rollout', () => {
    expect(() =>
      parseVersionMetrics({
        requests: 1,
        errors: 2,
        p95LatencyMs: 500,
        highSeverityIssues: 0,
      }),
    ).toThrow(/cannot exceed requests/u)
  })
})
