import { beforeEach, describe, expect, it, vi } from 'vitest'

const findProfile = vi.fn()

vi.mock('@/db', () => ({
  getDb: vi.fn(async () => ({
    query: { profiles: { findFirst: findProfile } },
  })),
  withDbConnection: vi.fn(async <T>(fn: () => Promise<T>) => fn()),
}))

import { DefaultAuthorizationService } from './authz/default-adapter'
import { withRequestScope } from './request-scope'

describe('withRequestScope', () => {
  beforeEach(() => {
    findProfile.mockReset()
  })

  it('caches repeated role checks without a service-level wrapper', async () => {
    findProfile.mockResolvedValue({ role: 'admin' })
    const service = new DefaultAuthorizationService()

    await withRequestScope(async () => {
      expect(await service.isRole('user-1', 'admin')).toBe(true)
      expect(await service.isRole('user-1', 'admin')).toBe(true)
    })

    expect(findProfile).toHaveBeenCalledTimes(1)
  })
})
