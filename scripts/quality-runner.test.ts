import { describe, expect, it, vi } from 'vitest'

import { runPlannedChecks } from './quality-runner.mjs'

const basePlan = {
  base: 'origin/main',
  checks: [
    { id: 'skip', name: 'Skipped', command: 'bun', args: [], skip: true },
    { id: 'run', name: 'Run', command: 'bun', args: [] },
  ],
}

describe('runPlannedChecks', () => {
  it('does not invoke skipped checks', () => {
    const runCommand = vi.fn(() => ({ status: 0 }))
    const passed = runPlannedChecks(basePlan, {
      repoRoot: '/repo',
      runCommand,
    })

    expect(passed).toBe(true)
    expect(runCommand).toHaveBeenCalledTimes(1)
    expect(runCommand).toHaveBeenCalledWith(basePlan.checks[1], '/repo')
  })

  it('stops after the first command failure', () => {
    const plan = {
      base: 'origin/main',
      checks: [
        { id: 'fail', name: 'Fail', command: 'bun', args: [] },
        { id: 'later', name: 'Later', command: 'bun', args: [] },
      ],
    }
    const runCommand = vi.fn(() => ({ status: 1 }))

    expect(runPlannedChecks(plan, { repoRoot: '/repo', runCommand })).toBe(
      false,
    )
    expect(runCommand).toHaveBeenCalledTimes(1)
  })

  it('propagates a Fallow failure', () => {
    const plan = {
      base: 'base-sha',
      checks: [{ id: 'fallow', name: 'Fallow', kind: 'fallow' }],
    }
    const runFallow = vi.fn(() => false)

    expect(runPlannedChecks(plan, { repoRoot: '/repo', runFallow })).toBe(false)
    expect(runFallow).toHaveBeenCalledWith({
      repoRoot: '/repo',
      base: 'base-sha',
    })
  })
})
