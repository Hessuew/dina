import { beforeEach, describe, expect, it, vi } from 'vitest'

const findProfileRoleById = vi.hoisted(() => vi.fn())

vi.mock('@/utils/repository', () => ({
  findProfileRoleById,
}))

vi.mock('@/db', () => ({
  withDbConnection: vi.fn(async <T>(fn: () => Promise<T>) => fn()),
}))

describe('withRequestScope', () => {
  beforeEach(() => {
    vi.resetModules()
    findProfileRoleById.mockReset()
  })

  it('caches repeated role checks without a service-level wrapper', async () => {
    findProfileRoleById.mockResolvedValue({ role: 'admin' })
    const { DefaultAuthorizationService } =
      await import('./authz/default-adapter')
    const { withRequestScope } = await import('./request-scope')
    const service = new DefaultAuthorizationService()

    await withRequestScope(async () => {
      expect(await service.isRole('user-1', 'admin')).toBe(true)
      expect(await service.isRole('user-1', 'admin')).toBe(true)
    })

    expect(findProfileRoleById).toHaveBeenCalledTimes(1)
  })
})
