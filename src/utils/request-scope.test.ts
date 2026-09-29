import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DefaultAuthorizationService } from './authz/default-adapter'
import { withRequestScope } from './request-scope'

const { findProfile } = vi.hoisted(() => ({ findProfile: vi.fn() }))

vi.mock('@/db', () => ({
  getDb: vi.fn(() => ({
    query: { profiles: { findFirst: findProfile } },
  })),
  withDbConnection: vi.fn(<T>(fn: () => Promise<T>) => fn()),
}))

vi.mock('@/utils/repository', () => ({
  findAssignmentById: vi.fn(),
  findCommentForWrite: vi.fn(),
  findCourseTeacher: vi.fn(),
  findLessonById: vi.fn(),
  findPostForWrite: vi.fn(),
  findProfileRoleById: findProfile,
  findSubmissionById: vi.fn(),
}))

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
