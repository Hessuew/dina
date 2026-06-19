import { describe, expect, it } from 'vitest'

import {
  describeCheck,
  formatCommand,
  interpretCheckResult,
} from './quality-fix.domain.mjs'

describe('formatCommand', () => {
  it('joins command and args with spaces', () => {
    expect(formatCommand('bunx', ['eslint', '--fix'])).toBe('bunx eslint --fix')
  })

  it('returns just the command when there are no args', () => {
    expect(formatCommand('tsc', [])).toBe('tsc')
  })
})

describe('describeCheck', () => {
  it('describes a skipped check without a command', () => {
    expect(
      describeCheck({ name: 'ESLint', command: 'bunx', args: [], skip: true }),
    ).toEqual({ skip: true, log: '\n==> ESLint: skipped' })
  })

  it('treats a missing skip flag as not skipped', () => {
    expect(
      describeCheck({ name: 'Prettier', command: 'bunx', args: ['prettier'] }),
    ).toEqual({ skip: false, log: '\n==> Prettier: bunx prettier' })
  })

  it('describes a runnable check with its formatted command', () => {
    expect(
      describeCheck({
        name: 'ESLint',
        command: 'bunx',
        args: ['eslint', '--fix'],
        skip: false,
      }),
    ).toEqual({ skip: false, log: '\n==> ESLint: bunx eslint --fix' })
  })
})

describe('interpretCheckResult', () => {
  it('reports failure to start when the result carries an error', () => {
    expect(
      interpretCheckResult('ESLint', { error: new Error('ENOENT') }),
    ).toEqual({ ok: false, error: '\nESLint failed to start: ENOENT' })
  })

  it('reports a non-zero exit code as failure', () => {
    expect(interpretCheckResult('ESLint', { status: 2 })).toEqual({
      ok: false,
      error: '\nESLint failed with exit code 2.',
    })
  })

  it('reports "unknown" when the exit code is null', () => {
    expect(interpretCheckResult('ESLint', { status: null })).toEqual({
      ok: false,
      error: '\nESLint failed with exit code unknown.',
    })
  })

  it('reports success on a zero exit code', () => {
    expect(interpretCheckResult('ESLint', { status: 0 })).toEqual({
      ok: true,
      error: null,
    })
  })
})
