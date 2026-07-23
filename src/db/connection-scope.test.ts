import { describe, expect, it, vi } from 'vitest'

import { createConnectionScope } from './connection-scope'

type FakeClient = { id: number; end: () => Promise<void> }

function createFakeOpen(opts?: { delayMs?: number; failTimes?: number }) {
  const delayMs = opts?.delayMs ?? 0
  let failLeft = opts?.failTimes ?? 0
  let nextId = 1
  const ended: Array<number> = []
  const open = vi.fn(async () => {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
    if (failLeft > 0) {
      failLeft -= 1
      throw new Error('connect failed')
    }
    const id = nextId++
    const client: FakeClient = {
      id,
      end: vi.fn(async () => {
        ended.push(id)
      }),
    }
    return { client, db: { clientId: id } }
  })
  return { open, ended }
}

describe('createConnectionScope', () => {
  it('reuses one connection for sequential getDb inside a scope and ends it', async () => {
    const { open, ended } = createFakeOpen()
    const scope = createConnectionScope(open)

    const result = await scope.withDbConnection(async () => {
      const a = await scope.getDb()
      const b = await scope.getDb()
      expect(a).toBe(b)
      expect(open).toHaveBeenCalledTimes(1)
      return a
    })

    expect(result).toEqual({ clientId: 1 })
    expect(ended).toEqual([1])
  })

  it('dedupes parallel first-touch getDb onto a single open', async () => {
    const { open, ended } = createFakeOpen({ delayMs: 20 })
    const scope = createConnectionScope(open)

    await scope.withDbConnection(async () => {
      const [a, b, c] = await Promise.all([
        scope.getDb(),
        scope.getDb(),
        scope.getDb(),
      ])
      expect(a).toBe(b)
      expect(b).toBe(c)
      expect(open).toHaveBeenCalledTimes(1)
    })

    expect(ended).toEqual([1])
  })

  it('nested withDbConnection re-enters outer scope without double end', async () => {
    const { open, ended } = createFakeOpen()
    const scope = createConnectionScope(open)

    await scope.withDbConnection(async () => {
      const outer = await scope.getDb()
      await scope.withDbConnection(async () => {
        const inner = await scope.getDb()
        expect(inner).toBe(outer)
      })
      // Still usable after nested return — outer owns lifecycle
      expect(await scope.getDb()).toBe(outer)
    })

    expect(open).toHaveBeenCalledTimes(1)
    expect(ended).toEqual([1])
  })

  it('clears failed in-flight connect so a later getDb can retry', async () => {
    const { open, ended } = createFakeOpen({ failTimes: 1 })
    const scope = createConnectionScope(open)

    await scope.withDbConnection(async () => {
      await expect(scope.getDb()).rejects.toThrow('connect failed')
      const db = await scope.getDb()
      expect(db).toEqual({ clientId: 1 })
      expect(open).toHaveBeenCalledTimes(2)
    })

    expect(ended).toEqual([1])
  })

  it('opens a one-off connection outside a scope', async () => {
    const { open, ended } = createFakeOpen()
    const scope = createConnectionScope(open)

    const db = await scope.getDb()
    expect(db).toEqual({ clientId: 1 })
    expect(open).toHaveBeenCalledTimes(1)
    // No scope → no automatic end
    expect(ended).toEqual([])
  })

  it('does not open a connection when fn never calls getDb', async () => {
    const { open, ended } = createFakeOpen()
    const scope = createConnectionScope(open)

    await scope.withDbConnection(async () => 'noop')

    expect(open).not.toHaveBeenCalled()
    expect(ended).toEqual([])
  })
})
