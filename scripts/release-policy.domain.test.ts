import { describe, expect, it } from 'vitest'

import {
  createReleaseTag,
  evaluateGuardrails,
  parseVersionMetrics,
  selectRolloutPlan,
  validateExternalHttpsResponse,
  validateExternalHttpsUrl,
  validateMetricsWindow,
  validateTargetSha,
  validateVersionAffinityReadiness,
  validateRolloutStageWaitSeconds,
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

describe('validateVersionAffinityReadiness', () => {
  it('accepts approved HTTPS evidence', () => {
    expect(
      validateVersionAffinityReadiness(
        'true',
        ' https://evidence.example.com/cloudflare-affinity ',
      ),
    ).toBe('https://evidence.example.com/cloudflare-affinity')
  })

  it.each([
    ['false', 'https://evidence.example.com/affinity'],
    ['true', 'http://evidence.example.com/affinity'],
    ['true', 'https://user:password@evidence.example.com/affinity'],
    ['true', ''],
  ])('rejects unapproved or unsafe evidence: %s %s', (ready, evidenceUrl) => {
    expect(() => validateVersionAffinityReadiness(ready, evidenceUrl)).toThrow()
  })
})

describe('validateExternalHttpsUrl', () => {
  it('returns a normalized credential-free HTTPS URL', () => {
    expect(
      validateExternalHttpsUrl(
        ' https://metrics.example.test/path ',
        'metrics',
      ),
    ).toEqual(new URL('https://metrics.example.test/path'))
  })

  it.each([
    'http://metrics.example.test/path',
    'https://user:password@metrics.example.test/path',
    'not-a-url',
  ])('rejects unsafe endpoint URLs: %s', (value) => {
    expect(() => validateExternalHttpsUrl(value, 'metrics')).toThrow(/HTTPS/u)
  })
})

describe('validateExternalHttpsResponse', () => {
  const expectedUrl = new URL('https://metrics.example.test/query')

  it('accepts a direct same-origin response', () => {
    expect(() =>
      validateExternalHttpsResponse(
        {
          redirected: false,
          status: 200,
          url: expectedUrl.toString(),
        },
        expectedUrl,
        'metrics',
      ),
    ).not.toThrow()
  })

  it.each([
    { redirected: true, status: 200, url: expectedUrl.toString() },
    { redirected: false, status: 302, url: expectedUrl.toString() },
    {
      redirected: false,
      status: 200,
      url: 'https://attacker.example/query',
    },
  ])('rejects unsafe response metadata: %j', (response) => {
    expect(() =>
      validateExternalHttpsResponse(response, expectedUrl, 'metrics'),
    ).toThrow()
  })
})

describe('validateMetricsWindow', () => {
  it('accepts a response for the requested window', () => {
    expect(() =>
      validateMetricsWindow(
        {
          since: '2026-09-30T10:00:00.000Z',
          until: '2026-09-30T10:05:00.000Z',
        },
        '2026-09-30T10:00:00Z',
        '2026-09-30T10:05:00Z',
      ),
    ).not.toThrow()
  })

  it.each([
    {},
    {
      since: '2026-09-30T09:55:00.000Z',
      until: '2026-09-30T10:05:00.000Z',
    },
    {
      since: '2026-09-30T10:05:00.000Z',
      until: '2026-09-30T10:00:00.000Z',
    },
  ])('rejects missing or stale windows: %j', (value) => {
    expect(() =>
      validateMetricsWindow(
        value,
        '2026-09-30T10:00:00Z',
        '2026-09-30T10:05:00Z',
      ),
    ).toThrow()
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

describe('validateRolloutStageWaitSeconds', () => {
  it('accepts waits that fit the gradual rollout budget', () => {
    expect(validateRolloutStageWaitSeconds('600')).toBe(600)
    expect(validateRolloutStageWaitSeconds('900')).toBe(900)
  })

  it('rejects waits outside the bounded rollout budget', () => {
    expect(() => validateRolloutStageWaitSeconds('599')).toThrow(/between/u)
    expect(() => validateRolloutStageWaitSeconds('901')).toThrow(/between/u)
    expect(() => validateRolloutStageWaitSeconds('600.5')).toThrow(/integer/u)
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

  it.each([
    [
      'error rate',
      { requests: 100, errors: 6, p95LatencyMs: 1000, highSeverityIssues: 0 },
    ],
    [
      'p95 latency',
      { requests: 100, errors: 5, p95LatencyMs: 1001, highSeverityIssues: 0 },
    ],
    [
      'high severity',
      { requests: 100, errors: 5, p95LatencyMs: 1000, highSeverityIssues: 1 },
    ],
  ])('fails standard rollout on %s', (_name, metrics) => {
    expect(evaluateGuardrails(metrics).passed).toBe(false)
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

  it('rejects an unavailable metrics response', () => {
    expect(() =>
      parseVersionMetrics({ error: 'metrics are not queryable' }),
    ).toThrow(/must be a non-negative number/u)
  })
})
