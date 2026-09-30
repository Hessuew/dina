import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findProfile } = vi.hoisted(() => ({ findProfile: vi.fn() }))

describe('withRequestScope', () => {
  beforeEach(() => {
    vi.resetModules()
    findProfile.mockReset()
    vi.doMock('@/db', () => ({
      getDb: vi.fn(() => ({
        query: { profiles: { findFirst: findProfile } },
      })),
      withDbConnection: vi.fn(<T>(fn: () => Promise<T>) => fn()),
    }))
    vi.doMock('@/utils/repository', () => ({
      findAssignmentById: vi.fn(),
      findCommentForWrite: vi.fn(),
      findCourseTeacher: vi.fn(),
      findLessonById: vi.fn(),
      findPostForWrite: vi.fn(),
      findProfileRoleById: findProfile,
      findSubmissionById: vi.fn(),
    }))
  })

  it('caches repeated role checks without a service-level wrapper', async () => {
    const { DefaultAuthorizationService } =
      await import('./authz/default-adapter')
    const { withRequestScope } = await import('./request-scope')
    findProfile.mockResolvedValue({ role: 'admin' })
    const service = new DefaultAuthorizationService()

    await withRequestScope(async () => {
      expect(await service.isRole('user-1', 'admin')).toBe(true)
      expect(await service.isRole('user-1', 'admin')).toBe(true)
    })

    expect(findProfile).toHaveBeenCalledTimes(1)
  })
})
