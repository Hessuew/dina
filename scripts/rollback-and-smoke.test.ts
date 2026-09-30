import { describe, expect, it } from 'vitest'

import { runRollbackAndSmoke } from './rollback-and-smoke'

describe('runRollbackAndSmoke', () => {
  it('deploys the rollback target before running exact-target smoke', async () => {
    const commands: Array<Array<string>> = []
    const exitCode = await runRollbackAndSmoke(async (command) => {
      commands.push(command)
      return 0
    })

    expect(exitCode).toBe(0)
    expect(commands).toEqual([
      ['run', 'scripts/rollback-deploy.ts'],
      ['run', 'scripts/rollback-smoke.ts'],
    ])
  })

  it('does not smoke after a failed rollback deployment', async () => {
    const commands: Array<Array<string>> = []
    const exitCode = await runRollbackAndSmoke(async (command) => {
      commands.push(command)
      return 1
    })

    expect(exitCode).toBe(1)
    expect(commands).toEqual([['run', 'scripts/rollback-deploy.ts']])
  })
})
