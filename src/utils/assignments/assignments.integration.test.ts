import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthorizationService } from '@/utils/authz/types'
import {
  DefaultAuthorizationService,
  setAuthorizationService,
} from '@/utils/authz'
import { AuthorizationError } from '@/utils/errors'
import {
  findAssignmentById,
  findSubmissionsByAssignmentId,
  upsertSubmission,
} from '@/utils/repository'
import {
  createAssignmentService,
  createOrUpdateSubmissionService,
  deleteAssignmentService,
  getAllAssignmentsForStudentService,
  getAllAssignmentsForTeacherService,
  getAssignmentService,
  getAssignmentSubmissionCountService,
  getLessonService,
  gradeSubmissionService,
  updateAssignmentService,
} from '@/utils/assignments/service/assignments.service'
import * as sharedRepository from '@/utils/repository'
import * as authUtils from '@/utils/auth/auth'
import {
  seedAssignment,
  seedCourse,
  seedCourseTeacher,
  seedLesson,
  seedProfile,
  seedSubmission,
} from '@/../test/integration/seed'
import { withObservabilityRequest } from '@/utils/observability/request-context'

afterEach(() => {
  vi.restoreAllMocks()
  setAuthorizationService(new DefaultAuthorizationService())
})

// Assignment services have no external IO — the DB (real PGlite via the `@/db`
// alias) covers repository SQL + domain logic, and authz resolves from real
// seeded course-teacher rows. See docs/TESTING_GUIDE.md / ADR 0009.

// Seeds a course owned by a fresh teacher plus a lesson, returning the ids a
// course-scoped assignment test needs.
async function seedCourseWithTeacher() {
  const teacherId = await seedProfile({ role: 'teacher' })
  const courseId = await seedCourse()
  await seedCourseTeacher(courseId, teacherId)
  const lessonId = await seedLesson({ courseId })
  return { teacherId, courseId, lessonId }
}

// Seeds a published assignment with one submitted student submission, returning
// the ids the read-side assignment tests need.
async function seedPublishedAssignmentWithSubmission() {
  const { teacherId, lessonId } = await seedCourseWithTeacher()
  const assignmentId = await seedAssignment({ lessonId, status: 'published' })
  const studentId = await seedProfile({ role: 'student' })
  await seedSubmission({ assignmentId, studentId, status: 'submitted' })
  return { teacherId, lessonId, assignmentId, studentId }
}

function rejectingAuthorizationService(error: Error): AuthorizationService {
  return {
    hasRole: vi.fn().mockRejectedValue(error),
    isRole: vi.fn(),
    getRole: vi.fn(),
    isAdmin: vi.fn(),
    canPerformAction: vi.fn().mockRejectedValue(error),
    isAllowedToPerformAction: vi.fn(),
  }
}

const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000)
const past = () => new Date(Date.now() - 24 * 60 * 60 * 1000)

describe('createAssignmentService (integration)', () => {
  it('logs lesson preflight persistence failures without raw details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const lessonId = randomUUID()
    const repositoryError = new Error('assignment lesson database detail')
    vi.spyOn(sharedRepository, 'findLessonById').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'assignment-create-read-failure' },
        }),
        () =>
          createAssignmentService(
            {
              lessonId,
              title: 'private title',
              dueDate: future().toISOString(),
            },
            teacherId,
          ),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('assignment lesson database detail')
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_create_failed',
      path: 'serverFn:createAssignment',
      requestId: 'assignment-create-read-failure',
      actorId: teacherId,
      lessonId,
      status: 'failure',
      errorCategory: 'assignment_read_persistence',
    })
  })

  it('course teacher creates a draft assignment defaulting maxGrade to 100', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { teacherId, lessonId } = await seedCourseWithTeacher()

    const { assignment } = await createAssignmentService(
      { lessonId, title: 'A1', dueDate: future().toISOString() },
      teacherId,
    )

    expect(assignment.status).toBe('draft')
    expect(assignment.maxGrade).toBe(100)
    expect(assignment.lessonId).toBe(lessonId)

    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'assignment_created')
    expect(event).toMatchObject({
      level: 'info',
      event: 'assignment_created',
      path: 'serverFn:createAssignment',
      status: 'success',
      actorId: teacherId,
      assignmentId: assignment.id,
      lessonId,
    })
    expect(event?.durationMs).toEqual(expect.any(Number))
    expect(JSON.stringify(event)).not.toContain('A1')
    infoSpy.mockRestore()
  })

  it('throws when the lesson does not exist', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(
      createAssignmentService(
        { lessonId: randomUUID(), title: 'x', dueDate: future().toISOString() },
        teacherId,
      ),
    ).rejects.toMatchObject({ code: 'LESSON_NOT_FOUND', status: 404 })
  })

  it('rejects a teacher who is not assigned to the course', async () => {
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId })
    const outsiderId = await seedProfile({ role: 'teacher' })

    await expect(
      createAssignmentService(
        { lessonId, title: 'x', dueDate: future().toISOString() },
        outsiderId,
      ),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
  })
})

describe('updateAssignmentService (integration)', () => {
  it('logs assignment preflight persistence failures without raw details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const assignmentId = randomUUID()
    const repositoryError = new Error('assignment update lookup detail')
    vi.spyOn(sharedRepository, 'findAssignmentById').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'assignment-update-read-failure' },
        }),
        () =>
          updateAssignmentService(
            {
              assignmentId,
              title: 'private title',
              dueDate: future().toISOString(),
            },
            teacherId,
          ),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('assignment update lookup detail')
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_update_failed',
      path: 'serverFn:updateAssignment',
      requestId: 'assignment-update-read-failure',
      actorId: teacherId,
      assignmentId,
      status: 'failure',
      errorCategory: 'assignment_read_persistence',
    })
  })

  it('course teacher publishes a draft assignment', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId, status: 'draft' })

    const { assignment } = await updateAssignmentService(
      {
        assignmentId,
        title: 'Updated',
        dueDate: future().toISOString(),
        status: 'published',
      },
      teacherId,
    )

    expect(assignment.status).toBe('published')
    expect(assignment.title).toBe('Updated')

    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'assignment_updated')
    expect(event).toMatchObject({
      level: 'info',
      event: 'assignment_updated',
      path: 'serverFn:updateAssignment',
      status: 'success',
      actorId: teacherId,
      assignmentId,
      lessonId,
      assignmentStatus: 'published',
    })
    expect(event?.durationMs).toEqual(expect.any(Number))
    expect(JSON.stringify(event)).not.toContain('Updated')
    infoSpy.mockRestore()
  })

  it('throws when the assignment does not exist', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(
      updateAssignmentService(
        {
          assignmentId: randomUUID(),
          title: 'x',
          dueDate: future().toISOString(),
        },
        teacherId,
      ),
    ).rejects.toMatchObject({ code: 'ASSIGNMENT_NOT_FOUND', status: 404 })
  })
})

describe('deleteAssignmentService (integration)', () => {
  it('logs assignment deletion preflight failures without raw details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const assignmentId = randomUUID()
    const repositoryError = new Error('assignment delete lookup detail')
    vi.spyOn(sharedRepository, 'findAssignmentById').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'assignment-delete-read-failure' },
        }),
        () => deleteAssignmentService({ assignmentId }, teacherId),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('assignment delete lookup detail')
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_delete_failed',
      path: 'serverFn:deleteAssignment',
      requestId: 'assignment-delete-read-failure',
      actorId: teacherId,
      assignmentId,
      status: 'failure',
      errorCategory: 'assignment_read_persistence',
    })
  })

  it('deletes an assignment that has no submissions', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId })

    await deleteAssignmentService({ assignmentId }, teacherId)

    expect(await findAssignmentById(assignmentId)).toBeUndefined()
    expect(JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      level: 'info',
      event: 'assignment_deleted',
      path: 'serverFn:deleteAssignment',
      status: 'success',
      actorId: teacherId,
      assignmentId,
      lessonId,
    })
    infoSpy.mockRestore()
  })

  it('refuses to delete an assignment with submissions', async () => {
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId })
    const studentId = await seedProfile({ role: 'student' })
    await seedSubmission({ assignmentId, studentId, status: 'submitted' })

    await expect(
      deleteAssignmentService({ assignmentId }, teacherId),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 })
  })
})

describe('assignment authorization preflight telemetry (integration)', () => {
  it.each([
    {
      name: 'creation',
      event: 'assignment_create_failed',
      path: 'serverFn:createAssignment',
      category: 'assignment_authorization_persistence',
      identityField: 'actorId',
      run: async (actorId: string) => {
        const { lessonId } = await seedCourseWithTeacher()
        await createAssignmentService(
          {
            lessonId,
            title: 'Private assignment',
            dueDate: future().toISOString(),
          },
          actorId,
        )
      },
    },
    {
      name: 'update',
      event: 'assignment_update_failed',
      path: 'serverFn:updateAssignment',
      category: 'assignment_authorization_persistence',
      identityField: 'actorId',
      run: async (actorId: string) => {
        const { lessonId } = await seedCourseWithTeacher()
        const assignmentId = await seedAssignment({ lessonId })
        await updateAssignmentService(
          {
            assignmentId,
            title: 'Private assignment',
            dueDate: future().toISOString(),
          },
          actorId,
        )
      },
    },
    {
      name: 'deletion',
      event: 'assignment_delete_failed',
      path: 'serverFn:deleteAssignment',
      category: 'assignment_authorization_persistence',
      identityField: 'actorId',
      run: async (actorId: string) => {
        const { lessonId } = await seedCourseWithTeacher()
        const assignmentId = await seedAssignment({ lessonId })
        await deleteAssignmentService({ assignmentId }, actorId)
      },
    },
    {
      name: 'grading',
      event: 'assignment_grading_failed',
      path: 'serverFn:gradeSubmission',
      category: 'assignment_grading_authorization_persistence',
      identityField: 'userId',
      run: async (actorId: string) => {
        const { lessonId } = await seedCourseWithTeacher()
        const assignmentId = await seedAssignment({
          lessonId,
          status: 'published',
        })
        const studentId = await seedProfile({ role: 'student' })
        const submissionId = await seedSubmission({
          assignmentId,
          studentId,
          status: 'submitted',
        })
        await gradeSubmissionService(
          { assignmentId, submissionId, grade: 95 },
          actorId,
        )
      },
    },
  ])(
    'logs unexpected $name authorization failures without raw details',
    async ({ category, event, identityField, path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const actorId = randomUUID()
      const repositoryError = new Error(
        'assignment authorization connectionString=secret; title=private',
      )
      setAuthorizationService(rejectingAuthorizationService(repositoryError))

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/assignments', {
            headers: { 'x-request-id': `assignment-auth-${path}` },
          }),
          () => run(actorId),
        ),
      ).rejects.toBe(repositoryError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const eventLine = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === event)
      expect(eventLine).toMatchObject({
        event,
        path,
        requestId: `assignment-auth-${path}`,
        [identityField]: actorId,
        status: 'failure',
        errorCategory: category,
        durationMs: expect.any(Number),
      })
      expect(serialized.join('\n')).not.toContain('connectionString')
      expect(serialized.join('\n')).not.toContain('title=private')
    },
  )

  it('keeps expected authorization denials out of operation telemetry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const denial = new AuthorizationError('course access required')
    setAuthorizationService(rejectingAuthorizationService(denial))
    const { lessonId } = await seedCourseWithTeacher()

    await expect(
      createAssignmentService(
        {
          lessonId,
          title: 'Denied assignment',
          dueDate: future().toISOString(),
        },
        randomUUID(),
      ),
    ).rejects.toBe(denial)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('getAssignmentService (integration)', () => {
  it('logs a redacted detail-read event with safe metadata', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { assignmentId, studentId } =
      await seedPublishedAssignmentWithSubmission()

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'assignment-detail-request' },
      }),
      () => getAssignmentService({ assignmentId }, studentId),
    )

    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_read_loaded',
      path: 'serverFn:getAssignment',
      requestId: 'assignment-detail-request',
      actorId: studentId,
      assignmentId,
      role: 'student',
      assignmentStatus: 'published',
      submissionPresent: true,
      status: 'success',
      durationMs: expect.any(Number),
    })
    expect(line).not.toContain('A1')
  })

  it('returns a published assignment and the student’s submission', async () => {
    const { assignmentId, studentId } =
      await seedPublishedAssignmentWithSubmission()

    const result = await getAssignmentService({ assignmentId }, studentId)

    expect(result.role).toBe('student')
    expect(result.assignment.id).toBe(assignmentId)
    expect(result.submission).not.toBeNull()
  })

  it('hides an unpublished assignment from a student', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId, status: 'draft' })
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      getAssignmentService({ assignmentId }, studentId),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED', status: 403 })
  })

  it('lets an outsider teacher open a published assignment shell', async () => {
    const { assignmentId } = await seedPublishedAssignmentWithSubmission()
    const outsiderId = await seedProfile({ role: 'teacher' })

    const result = await getAssignmentService({ assignmentId }, outsiderId)

    expect(result.role).toBe('teacher')
    expect(result.assignment.id).toBe(assignmentId)
    expect(result.permissions.canManage).toBe(false)
    expect(result.allSubmissions).toEqual([])
  })

  it('hides an unpublished assignment from a non-course teacher', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId, status: 'draft' })
    const outsiderId = await seedProfile({ role: 'teacher' })

    await expect(
      getAssignmentService({ assignmentId }, outsiderId),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED', status: 403 })
  })

  it('lets the course teacher open a draft assignment', async () => {
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId, status: 'draft' })

    const result = await getAssignmentService({ assignmentId }, teacherId)

    expect(result.assignment.status).toBe('draft')
    expect(result.permissions.canManage).toBe(true)
    expect(result.allSubmissions).toEqual([])
  })

  it('includes manager submissions in the assignment detail read', async () => {
    const { teacherId, assignmentId, studentId } =
      await seedPublishedAssignmentWithSubmission()

    const result = await getAssignmentService({ assignmentId }, teacherId)

    expect(result.allSubmissions).toHaveLength(1)
    expect(result.allSubmissions[0].student).toMatchObject({
      id: studentId,
      fullName: 'Test User',
    })
  })

  it('throws when the assignment does not exist', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      getAssignmentService({ assignmentId: randomUUID() }, studentId),
    ).rejects.toMatchObject({ code: 'ASSIGNMENT_NOT_FOUND', status: 404 })
  })
})

describe('getLessonService (integration)', () => {
  it('logs a redacted lesson-read event with safe counts', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { courseId } = await seedCourseWithTeacher()
    const lessonId = await seedLesson({
      courseId,
      isPublished: true,
      content: 'Private lesson content',
    })
    await seedAssignment({ lessonId, status: 'published' })
    const studentId = await seedProfile({ role: 'student' })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'lesson-detail-request' },
      }),
      () => getLessonService({ lessonId }, studentId),
    )

    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_read_loaded',
      path: 'serverFn:getLesson',
      requestId: 'lesson-detail-request',
      actorId: studentId,
      lessonId,
      courseId,
      role: 'student',
      assignmentCount: 1,
      lessonPublished: true,
      status: 'success',
      durationMs: expect.any(Number),
    })
    expect(line).not.toContain('Private lesson content')
  })

  it('returns only published assignments to a student', async () => {
    const { courseId } = await seedCourseWithTeacher()
    const lessonId = await seedLesson({
      courseId,
      isPublished: true,
      content: 'Published lesson content',
    })
    await seedAssignment({ lessonId, status: 'published' })
    await seedAssignment({ lessonId, status: 'draft' })
    const studentId = await seedProfile({ role: 'student' })

    const result = await getLessonService({ lessonId }, studentId)

    expect(result.lesson.content).toBe('Published lesson content')
    expect(result.lesson.assignments).toHaveLength(1)
    expect(result.lesson.assignments[0]?.status).toBe('published')
  })

  it('hides an unpublished lesson from a student', async () => {
    const { courseId } = await seedCourseWithTeacher()
    const lessonId = await seedLesson({ courseId, isPublished: false })
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      getLessonService({ lessonId }, studentId),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED', status: 403 })
  })

  it('lets the course teacher open an unpublished lesson with draft assignments', async () => {
    const { teacherId, courseId } = await seedCourseWithTeacher()
    const lessonId = await seedLesson({ courseId, isPublished: false })
    await seedAssignment({ lessonId, status: 'draft' })

    const result = await getLessonService({ lessonId }, teacherId)

    expect(result.lesson.isPublished).toBe(false)
    expect(result.lesson.assignments).toHaveLength(1)
    expect(result.permissions.canManage).toBe(true)
  })

  it('derives isCompleted from graded submissions for students', async () => {
    const { courseId } = await seedCourseWithTeacher()
    const lessonId = await seedLesson({ courseId, isPublished: true })
    const firstAssignmentId = await seedAssignment({
      lessonId,
      status: 'published',
    })
    const secondAssignmentId = await seedAssignment({
      lessonId,
      status: 'published',
    })
    const studentId = await seedProfile({ role: 'student' })
    await seedSubmission({
      assignmentId: firstAssignmentId,
      studentId,
      status: 'submitted',
      grade: 90,
    })

    const incomplete = await getLessonService({ lessonId }, studentId)
    expect(incomplete.isCompleted).toBe(false)

    await seedSubmission({
      assignmentId: secondAssignmentId,
      studentId,
      status: 'submitted',
      grade: 85,
    })

    const complete = await getLessonService({ lessonId }, studentId)
    expect(complete.isCompleted).toBe(true)
  })
})

describe('createOrUpdateSubmissionService (integration)', () => {
  it('logs assignment lookup failures without exposing repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const studentId = await seedProfile({ role: 'student' })
    const assignmentId = randomUUID()
    const repositoryError = new Error('submission assignment lookup detail')
    vi.spyOn(sharedRepository, 'findAssignmentById').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'submission-assignment-read-failure' },
        }),
        () =>
          createOrUpdateSubmissionService(
            { assignmentId, submit: true },
            studentId,
          ),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('submission assignment lookup detail')
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_submission_failed',
      path: 'serverFn:createOrUpdateSubmission',
      requestId: 'submission-assignment-read-failure',
      assignmentId,
      userId: studentId,
      status: 'error',
      errorCategory: 'submission_read_persistence',
    })
  })

  it('logs existing-submission lookup failures without exposing repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: future(),
    })
    const studentId = await seedProfile({ role: 'student' })
    const repositoryError = new Error('existing submission lookup detail')
    vi.spyOn(
      sharedRepository,
      'findSubmissionByAssignmentAndStudent',
    ).mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'submission-existing-read-failure' },
        }),
        () =>
          createOrUpdateSubmissionService(
            { assignmentId, submit: true },
            studentId,
          ),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('existing submission lookup detail')
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_submission_failed',
      path: 'serverFn:createOrUpdateSubmission',
      requestId: 'submission-existing-read-failure',
      assignmentId,
      userId: studentId,
      status: 'error',
      errorCategory: 'submission_read_persistence',
    })
  })

  it('submits within the window', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: future(),
    })
    const studentId = await seedProfile({ role: 'student' })

    const { submission } = await createOrUpdateSubmissionService(
      { assignmentId, content: 'my answer', submit: true },
      studentId,
    )

    expect(submission.status).toBe('submitted')
    expect(submission.submittedAt).not.toBeNull()
  })

  it('saves a draft without a submitted timestamp', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: future(),
    })
    const studentId = await seedProfile({ role: 'student' })

    const { submission } = await createOrUpdateSubmissionService(
      { assignmentId, content: 'draft', submit: false },
      studentId,
    )

    expect(submission.status).toBe('draft')
    expect(submission.submittedAt).toBeNull()
  })

  it('keeps one row when two first saves race', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: future(),
    })
    const studentId = await seedProfile({ role: 'student' })

    await Promise.all([
      createOrUpdateSubmissionService(
        { assignmentId, content: 'first', submit: false },
        studentId,
      ),
      createOrUpdateSubmissionService(
        { assignmentId, content: 'second', submit: false },
        studentId,
      ),
    ])

    const rows = await findSubmissionsByAssignmentId(assignmentId)
    expect(rows).toHaveLength(1)
  })

  it('does not let a racing draft downgrade a submitted first save', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: future(),
    })
    const studentId = await seedProfile({ role: 'student' })

    const submittedAt = new Date()
    await upsertSubmission({
      assignmentId,
      studentId,
      content: 'submitted answer',
      status: 'submitted',
      submittedAt,
    })
    const result = await upsertSubmission({
      assignmentId,
      studentId,
      content: 'racing draft',
      status: 'draft',
      submittedAt: null,
    })

    expect(result.status).toBe('submitted')
    expect(result.submittedAt).toEqual(submittedAt)
  })

  it('promotes a racing draft when the submitted first save arrives last', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: future(),
    })
    const studentId = await seedProfile({ role: 'student' })

    await upsertSubmission({
      assignmentId,
      studentId,
      content: 'draft answer',
      status: 'draft',
      submittedAt: null,
    })
    const submittedAt = new Date()
    const result = await upsertSubmission({
      assignmentId,
      studentId,
      content: 'submitted answer',
      status: 'submitted',
      submittedAt,
    })

    expect(result.status).toBe('submitted')
    expect(result.submittedAt).toEqual(submittedAt)
  })

  it('rejects a non-student caller', async () => {
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: future(),
    })

    await expect(
      createOrUpdateSubmissionService(
        { assignmentId, submit: true },
        teacherId,
      ),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
  })

  it('rejects an authenticated user without a profile before insert', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: future(),
    })

    await expect(
      createOrUpdateSubmissionService(
        { assignmentId, submit: true },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })

  it('accepts a submission after the due date while published', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: past(),
    })
    const studentId = await seedProfile({ role: 'student' })

    const { submission } = await createOrUpdateSubmissionService(
      { assignmentId, content: 'late answer', submit: true },
      studentId,
    )
    expect(submission.status).toBe('submitted')
    expect(submission.submittedAt).not.toBeNull()
  })

  it('rejects a submission to an unpublished assignment', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'draft',
      dueDate: future(),
    })
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      createOrUpdateSubmissionService(
        { assignmentId, submit: true },
        studentId,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 })
  })

  it('throws when the assignment does not exist', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      createOrUpdateSubmissionService(
        { assignmentId: randomUUID(), submit: true },
        studentId,
      ),
    ).rejects.toMatchObject({ code: 'ASSIGNMENT_NOT_FOUND', status: 404 })
  })
})

describe('assignment actor-profile telemetry (integration)', () => {
  it.each([
    {
      name: 'submission',
      requestId: 'assignment-submission-profile-failure',
      event: 'assignment_submission_failed',
      path: 'serverFn:createOrUpdateSubmission',
      category: 'submission_read_persistence',
      status: 'error',
      identityField: 'userId',
      run: async (actorId: string) => {
        await createOrUpdateSubmissionService(
          { assignmentId: randomUUID(), submit: true },
          actorId,
        )
      },
    },
    {
      name: 'student list',
      requestId: 'assignment-student-list-profile-failure',
      event: 'assignment_read_failed',
      path: 'serverFn:getAllAssignmentsForStudent',
      category: 'assignment_read_persistence',
      status: 'failure',
      identityField: 'actorId',
      run: async (actorId: string) => {
        await getAllAssignmentsForStudentService(actorId)
      },
    },
    {
      name: 'teacher list',
      requestId: 'assignment-teacher-list-profile-failure',
      event: 'assignment_read_failed',
      path: 'serverFn:getAllAssignmentsForTeacher',
      category: 'assignment_read_persistence',
      status: 'failure',
      identityField: 'actorId',
      run: async (actorId: string) => {
        await getAllAssignmentsForTeacherService(actorId)
      },
    },
  ])(
    'logs unexpected $name actor-profile failures without raw details',
    async ({
      requestId,
      event,
      path,
      category,
      status,
      identityField,
      run,
    }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const actorId = randomUUID()
      const repositoryError = new Error(
        'assignment actor profile connectionString=secret; email=actor@test.dev',
      )
      vi.spyOn(authUtils, 'getUserProfile').mockRejectedValueOnce(
        repositoryError,
      )

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/assignments', {
            headers: { 'x-request-id': requestId },
          }),
          () => run(actorId),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('actor@test.dev')
      expect(JSON.parse(line)).toMatchObject({
        event,
        path,
        requestId,
        [identityField]: actorId,
        status,
        errorCategory: category,
        durationMs: expect.any(Number),
      })
    },
  )
})

describe('getAllAssignmentsForStudentService (integration)', () => {
  it('logs a redacted student-list read event with safe counts', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      title: 'Private assignment title',
    })
    const studentId = await seedProfile({ role: 'student' })
    await seedSubmission({ assignmentId, studentId, status: 'submitted' })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'assignment-student-list-request' },
      }),
      () => getAllAssignmentsForStudentService(studentId),
    )

    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_read_loaded',
      path: 'serverFn:getAllAssignmentsForStudent',
      requestId: 'assignment-student-list-request',
      actorId: studentId,
      role: 'student',
      assignmentCount: 1,
      submittedCount: 1,
      status: 'success',
      durationMs: expect.any(Number),
    })
    expect(line).not.toContain('Private assignment title')
  })

  it('logs stable failure metadata and preserves repository errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const studentId = await seedProfile({ role: 'student' })
    const repositoryError = new Error(
      'connectionString=secret; content=private submission',
    )
    vi.spyOn(
      sharedRepository,
      'findPublishedAssignments',
    ).mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'assignment-list-failure-request' },
        }),
        () => getAllAssignmentsForStudentService(studentId),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('private submission')
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_read_failed',
      path: 'serverFn:getAllAssignmentsForStudent',
      requestId: 'assignment-list-failure-request',
      actorId: studentId,
      status: 'failure',
      errorCategory: 'assignment_read_persistence',
      durationMs: expect.any(Number),
    })
  })

  it('returns published assignments for a student', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    await seedAssignment({ lessonId, status: 'published' })
    const studentId = await seedProfile({ role: 'student' })

    const { assignments } = await getAllAssignmentsForStudentService(studentId)

    expect(assignments.length).toBeGreaterThanOrEqual(1)
    expect(assignments[0]).toHaveProperty('submission')
  })

  it('rejects a non-student caller', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(
      getAllAssignmentsForStudentService(teacherId),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
  })
})

describe('getAllAssignmentsForTeacherService (integration)', () => {
  it('logs the teacher-list read scope with safe result counts', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { teacherId } = await seedPublishedAssignmentWithSubmission()

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'assignment-teacher-owned-request' },
      }),
      () => getAllAssignmentsForTeacherService(teacherId, 'owned'),
    )
    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'assignment-teacher-catalog-request' },
      }),
      () => getAllAssignmentsForTeacherService(teacherId, 'catalog'),
    )

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'assignment_read_loaded',
          path: 'serverFn:getAllAssignmentsForTeacher',
          requestId: 'assignment-teacher-owned-request',
          actorId: teacherId,
          role: 'teacher',
          scope: 'owned',
          assignmentCount: 1,
        }),
        expect.objectContaining({
          event: 'assignment_read_loaded',
          path: 'serverFn:getAllAssignmentsForTeacher',
          requestId: 'assignment-teacher-catalog-request',
          actorId: teacherId,
          role: 'teacher',
          scope: 'catalog',
          assignmentCount: 1,
        }),
      ]),
    )
  })

  it('returns the teacher’s owned assignments with submission stats', async () => {
    const { teacherId } = await seedPublishedAssignmentWithSubmission()

    const { assignments } = await getAllAssignmentsForTeacherService(
      teacherId,
      'owned',
    )

    expect(assignments.length).toBeGreaterThanOrEqual(1)
    expect(assignments[0].submissionStats).toMatchObject({
      total: expect.any(Number),
      submitted: expect.any(Number),
      graded: expect.any(Number),
    })
  })

  it('returns an empty owned list for a teacher with no courses', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    const { assignments } = await getAllAssignmentsForTeacherService(
      teacherId,
      'owned',
    )

    expect(assignments).toEqual([])
  })

  it('catalog includes other courses’ published assignments without stats', async () => {
    const { assignmentId } = await seedPublishedAssignmentWithSubmission()
    const outsiderId = await seedProfile({ role: 'teacher' })

    const { assignments } = await getAllAssignmentsForTeacherService(
      outsiderId,
      'catalog',
    )

    const row = assignments.find((a) => a.id === assignmentId)
    expect(row).toBeDefined()
    expect(row?.submissionStats).toBeUndefined()
  })

  it('catalog hides other courses’ draft assignments', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const draftId = await seedAssignment({ lessonId, status: 'draft' })
    const outsiderId = await seedProfile({ role: 'teacher' })

    const { assignments } = await getAllAssignmentsForTeacherService(
      outsiderId,
      'catalog',
    )

    expect(assignments.some((a) => a.id === draftId)).toBe(false)
  })

  it('rejects a student caller', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      getAllAssignmentsForTeacherService(studentId),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
  })
})

describe('assignment submission reads (integration)', () => {
  it('logs safe submission-read telemetry for count and detail paths', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { teacherId, assignmentId, studentId } =
      await seedPublishedAssignmentWithSubmission()

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'assignment-count-request' },
      }),
      () => getAssignmentSubmissionCountService({ assignmentId }, teacherId),
    )
    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'assignment-detail-request' },
      }),
      () => getAssignmentService({ assignmentId }, teacherId),
    )

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'assignment_read_loaded',
          path: 'serverFn:getAssignmentSubmissionCount',
          requestId: 'assignment-count-request',
          actorId: teacherId,
          assignmentId,
          submissionCount: 1,
        }),
        expect.objectContaining({
          event: 'assignment_read_loaded',
          path: 'serverFn:getAssignment',
          requestId: 'assignment-detail-request',
          actorId: teacherId,
          assignmentId,
          submissionPresent: false,
        }),
      ]),
    )
    expect(JSON.stringify(events)).not.toContain(studentId)
  })
})

describe('getAssignmentSubmissionCountService (integration)', () => {
  it('returns the number of submissions', async () => {
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId })
    const s1 = await seedProfile({ role: 'student' })
    const s2 = await seedProfile({ role: 'student' })
    await seedSubmission({ assignmentId, studentId: s1 })
    await seedSubmission({ assignmentId, studentId: s2 })

    const { count } = await getAssignmentSubmissionCountService(
      { assignmentId },
      teacherId,
    )

    expect(count).toBe(2)
  })
})

describe('gradeSubmissionService (integration)', () => {
  it('logs grading assignment lookup failures without raw details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const assignmentId = randomUUID()
    const repositoryError = new Error('grading assignment lookup detail')
    vi.spyOn(sharedRepository, 'findAssignmentById').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'grading-assignment-read-failure' },
        }),
        () =>
          gradeSubmissionService(
            { assignmentId, submissionId: randomUUID(), grade: 95 },
            teacherId,
          ),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('grading assignment lookup detail')
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_grading_failed',
      path: 'serverFn:gradeSubmission',
      requestId: 'grading-assignment-read-failure',
      assignmentId,
      userId: teacherId,
      status: 'failure',
      errorCategory: 'assignment_grading_read_persistence',
    })
  })

  it('logs grading submission lookup failures without raw details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId, status: 'published' })
    const submissionId = randomUUID()
    const repositoryError = new Error('grading submission lookup detail')
    vi.spyOn(sharedRepository, 'findSubmissionById').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'grading-submission-read-failure' },
        }),
        () =>
          gradeSubmissionService(
            { assignmentId, submissionId, grade: 95 },
            teacherId,
          ),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('grading submission lookup detail')
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_grading_failed',
      path: 'serverFn:gradeSubmission',
      requestId: 'grading-submission-read-failure',
      assignmentId,
      submissionId,
      userId: teacherId,
      status: 'failure',
      errorCategory: 'assignment_grading_read_persistence',
    })
  })

  it('grades a submission belonging to the assignment', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId, status: 'published' })
    const studentId = await seedProfile({ role: 'student' })
    const submissionId = await seedSubmission({
      assignmentId,
      studentId,
      status: 'submitted',
    })

    const { submission } = await gradeSubmissionService(
      { assignmentId, submissionId, grade: 95, feedback: 'great' },
      teacherId,
    )

    expect(submission.grade).toBe(95)
    expect(submission.gradedAt).not.toBeNull()

    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'assignment_grading_completed')
    expect(event).toMatchObject({
      level: 'info',
      event: 'assignment_grading_completed',
      path: 'serverFn:gradeSubmission',
      status: 'graded',
      assignmentId,
      submissionId,
      userId: teacherId,
    })
    expect(event?.durationMs).toEqual(expect.any(Number))
    infoSpy.mockRestore()
  })

  it('rejects a submission that belongs to a different assignment', async () => {
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId, status: 'published' })
    const otherAssignmentId = await seedAssignment({ lessonId })
    const studentId = await seedProfile({ role: 'student' })
    const submissionId = await seedSubmission({
      assignmentId: otherAssignmentId,
      studentId,
      status: 'submitted',
    })

    await expect(
      gradeSubmissionService(
        { assignmentId, submissionId, grade: 50 },
        teacherId,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 })
  })

  it('logs grading persistence failures without leaking repository details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId, status: 'published' })
    const studentId = await seedProfile({ role: 'student' })
    const submissionId = await seedSubmission({
      assignmentId,
      studentId,
      status: 'submitted',
    })
    const repositoryError = new Error(
      'connectionString=secret; feedback=private submission',
    )
    vi.spyOn(sharedRepository, 'updateSubmissionGrade').mockRejectedValue(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'assignment-grading-failure-request' },
        }),
        () =>
          gradeSubmissionService(
            { assignmentId, submissionId, grade: 95, feedback: 'private' },
            teacherId,
          ),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('private submission')
    expect(JSON.parse(line)).toMatchObject({
      event: 'assignment_grading_failed',
      level: 'error',
      path: 'serverFn:gradeSubmission',
      requestId: 'assignment-grading-failure-request',
      status: 'failure',
      errorCategory: 'assignment_grading_persistence',
      assignmentId,
      submissionId,
      userId: teacherId,
      durationMs: expect.any(Number),
    })
  })

  it('throws when the submission does not exist', async () => {
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId, status: 'published' })

    await expect(
      gradeSubmissionService(
        { assignmentId, submissionId: randomUUID(), grade: 50 },
        teacherId,
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })

  it('throws when the assignment does not exist', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(
      gradeSubmissionService(
        { assignmentId: randomUUID(), submissionId: randomUUID(), grade: 50 },
        teacherId,
      ),
    ).rejects.toMatchObject({ code: 'ASSIGNMENT_NOT_FOUND', status: 404 })
  })
})
