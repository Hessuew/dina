import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DefaultAuthorizationService } from './default-adapter'
import type { ResourceType } from '@/utils/authz/types'
import { withObservabilityRequest } from '@/utils/observability/request-context'

const queries = vi.hoisted(() => ({
  profiles: vi.fn(),
  courseTeachers: vi.fn(),
  lessons: vi.fn(),
  assignments: vi.fn(),
  submissions: vi.fn(),
  posts: vi.fn(),
  comments: vi.fn(),
}))

vi.mock('@/db', () => ({
  getDb: vi.fn(() => ({
    query: {
      profiles: { findFirst: queries.profiles },
      courseTeachers: { findFirst: queries.courseTeachers },
      lessons: { findFirst: queries.lessons },
      assignments: { findFirst: queries.assignments },
      submissions: { findFirst: queries.submissions },
      posts: { findFirst: queries.posts },
      postComments: { findFirst: queries.comments },
    },
  })),
}))

vi.mock('@/utils/repository', () => ({
  findAssignmentById: queries.assignments,
  findProfileRoleById: queries.profiles,
}))

beforeEach(() => {
  Object.values(queries).forEach((query) => query.mockReset())
})

describe('authorization persistence telemetry', () => {
  it.each([
    {
      name: 'role checks',
      invoke: async (service: DefaultAuthorizationService) => {
        await service.isRole('user-1', 'teacher')
      },
      fields: { role: 'teacher' },
    },
    {
      name: 'role reads',
      invoke: async (service: DefaultAuthorizationService) => {
        await service.getRole('user-1')
      },
      fields: {},
    },
  ])('logs unexpected $name failures', async ({ invoke, fields }) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error(
      'connectionString=secret; email=private@example.com',
    )
    queries.profiles.mockRejectedValueOnce(repositoryError)

    try {
      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org', {
            headers: { 'x-request-id': 'authz-role-request' },
          }),
          () => invoke(new DefaultAuthorizationService()),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('private@example.com')
      expect(JSON.parse(line)).toMatchObject({
        event: 'authorization_lookup_failed',
        path: 'authz:role',
        requestId: 'authz-role-request',
        userId: 'user-1',
        status: 'failure',
        errorCategory: 'authorization_role_read_persistence',
        durationMs: expect.any(Number),
        ...fields,
      })
    } finally {
      errorSpy.mockRestore()
    }
  })

  it.each([
    {
      name: 'course',
      action: 'editCourse' as const,
      resourceId: 'course-1',
      query: queries.courseTeachers,
      category: 'authorization_course_read_persistence',
    },
    {
      name: 'lesson',
      action: 'editLesson' as const,
      resourceId: 'lesson-1',
      query: queries.lessons,
      category: 'authorization_lesson_read_persistence',
    },
    {
      name: 'assignment',
      action: 'gradeAssignment' as const,
      resourceId: 'assignment-1',
      query: queries.assignments,
      category: 'authorization_assignment_read_persistence',
    },
    {
      name: 'submission',
      action: 'gradeAssignment' as const,
      resourceId: 'submission-1',
      query: queries.submissions,
      category: 'authorization_submission_read_persistence',
    },
    {
      name: 'post',
      action: 'editPost' as const,
      resourceId: 'post-1',
      query: queries.posts,
      category: 'authorization_post_read_persistence',
    },
    {
      name: 'comment',
      action: 'editComment' as const,
      resourceId: 'comment-1',
      query: queries.comments,
      category: 'authorization_comment_read_persistence',
    },
  ])('logs unexpected $name resource lookup failures', async (input) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error(
      'database detail=private; token=secret-value',
    )
    queries.profiles.mockResolvedValueOnce({ role: 'student' })
    input.query.mockRejectedValueOnce(repositoryError)

    try {
      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org', {
            headers: { 'cf-ray': `authz-${input.name}-ray` },
          }),
          () =>
            new DefaultAuthorizationService().isAllowedToPerformAction(
              'user-1',
              input.action,
              input.name as ResourceType,
              input.resourceId,
            ),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(line).not.toContain('private')
      expect(line).not.toContain('secret-value')
      expect(JSON.parse(line)).toMatchObject({
        event: 'authorization_lookup_failed',
        path: `authz:${input.name}`,
        requestId: `authz-${input.name}-ray`,
        userId: 'user-1',
        action: input.action,
        resourceType: input.name,
        resourceId: input.resourceId,
        status: 'failure',
        errorCategory: input.category,
        durationMs: expect.any(Number),
      })
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('keeps expected resource denials out of error telemetry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    queries.profiles.mockResolvedValueOnce({ role: 'student' })
    queries.courseTeachers.mockResolvedValueOnce(undefined)

    try {
      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org', {
            headers: { 'x-request-id': 'authz-denied-request' },
          }),
          () =>
            new DefaultAuthorizationService().isAllowedToPerformAction(
              'user-1',
              'editCourse',
              'course',
              'course-1',
            ),
        ),
      ).resolves.toBe(false)
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })
})
