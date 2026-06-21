import { describe, expect, it } from 'vitest'

import {
  assertJsonMatch,
  blockingFallowVerdictMessage,
  collectIntroducedComplexity,
  extractJson,
  fallowExitStatusError,
  fallowExitStatusPasses,
  fallowVerdictAllowsSubmit,
  resolveVerdict,
} from './quality-gate.domain.mjs'

describe('resolveVerdict', () => {
  it('returns the verdict when present', () => {
    expect(resolveVerdict({ verdict: 'pass' })).toBe('pass')
  })

  it('falls back to "unknown" when the verdict is missing', () => {
    expect(resolveVerdict({})).toBe('unknown')
  })

  it('falls back to "unknown" when the output is nullish', () => {
    expect(resolveVerdict(undefined)).toBe('unknown')
  })
})

describe('collectIntroducedComplexity', () => {
  it('keeps only findings flagged as introduced', () => {
    const output = {
      complexity: {
        findings: [
          { name: 'a', introduced: true },
          { name: 'b', introduced: false },
          { name: 'c' },
        ],
      },
    }
    expect(collectIntroducedComplexity(output)).toEqual([
      { name: 'a', introduced: true },
    ])
  })

  it('returns an empty array when there are no complexity findings', () => {
    expect(collectIntroducedComplexity({})).toEqual([])
  })

  it('returns an empty array when the output is nullish', () => {
    expect(collectIntroducedComplexity(undefined)).toEqual([])
  })
})

describe('fallowVerdictAllowsSubmit', () => {
  it('allows submit on pass', () => {
    expect(fallowVerdictAllowsSubmit('pass')).toBe(true)
  })

  it('allows submit on warn', () => {
    expect(fallowVerdictAllowsSubmit('warn')).toBe(true)
  })

  it('blocks submit on any other verdict', () => {
    expect(fallowVerdictAllowsSubmit('fail')).toBe(false)
  })
})

describe('blockingFallowVerdictMessage', () => {
  it('reports a fail verdict', () => {
    expect(blockingFallowVerdictMessage('fail')).toBe(
      'Fallow reported fail; blocking submit.',
    )
  })

  it('reports an unknown verdict by name', () => {
    expect(blockingFallowVerdictMessage('weird')).toBe(
      'Fallow returned unknown verdict "weird"; blocking submit.',
    )
  })
})

describe('fallowExitStatusPasses', () => {
  it('passes on a zero exit code', () => {
    expect(fallowExitStatusPasses(0, 'fail')).toBe(true)
  })

  it('passes on a warn verdict despite a non-zero exit code', () => {
    expect(fallowExitStatusPasses(1, 'warn')).toBe(true)
  })

  it('fails on a non-zero exit code without a warn verdict', () => {
    expect(fallowExitStatusPasses(1, 'pass')).toBe(false)
  })
})

describe('fallowExitStatusError', () => {
  it('includes the exit code', () => {
    expect(fallowExitStatusError(2)).toBe(
      'Fallow exited with code 2; blocking submit.',
    )
  })

  it('reports "unknown" when the exit code is nullish', () => {
    expect(fallowExitStatusError(null)).toBe(
      'Fallow exited with code unknown; blocking submit.',
    )
  })
})

describe('assertJsonMatch', () => {
  it('returns the first match when present', () => {
    expect(assertJsonMatch(['{"a":1}', 'ignored'])).toBe('{"a":1}')
  })

  it('throws when no match is found', () => {
    expect(() => assertJsonMatch(null)).toThrow(
      'No JSON object found in Fallow output',
    )
  })
})

describe('extractJson', () => {
  it('parses a JSON object embedded in surrounding text', () => {
    expect(extractJson('noise {"verdict":"pass"} trailing')).toEqual({
      verdict: 'pass',
    })
  })

  it('throws a descriptive error when no JSON object is present', () => {
    expect(() => extractJson('no braces here')).toThrow(
      'No JSON object found in Fallow output',
    )
  })

  it('wraps JSON syntax errors with a parse-failure message', () => {
    expect(() => extractJson('{not valid json}')).toThrow(
      /^Failed to parse JSON:/u,
    )
  })
})
