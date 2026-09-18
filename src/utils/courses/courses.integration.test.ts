import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthorizationService } from '@/utils/authz/types'
import {
  DefaultAuthorizationService,
  setAuthorizationService,
} from '@/utils/authz'
import { AuthorizationError } from '@/utils/errors'
import * as authUtils from '@/utils/auth/auth'
import * as sharedRepository from '@/utils/repository'
import { getDb } from '@/db'
import {
  findCourseById,
  findTeacherIdsByCourseId,
  insertCourseInTransaction,
  insertCourseTeacherAssignmentsInTransaction,
} from '@/utils/repository'
import {
  createCourseService,
  deleteCourseService,
  getCourseService,
  getCoursesService,
  updateCourseService,
} from '@/utils/courses/service/course.service'
import {
  createLessonService,
  deleteLessonService,
  getCalendarEventsService,
  getUpcomingLessonsService,
  updateLessonService,
} from '@/utils/courses/service/lesson.service'
import {
  assignTeachersToCourse,
  getCourseTeachersService,
  updateCourseTeachersService,
  validateTeacherPair,
} from '@/utils/courses/service/teacher-assignment.service'
import {
  seedAssignment,
  seedCourse,
  seedCourseTeacher,
  seedLesson,
  seedMedia,
  seedProfile,
  seedSubmission,
} from '@/../test/integration/seed'
import { resetCreateSignedUrlsMock } from '@/../test/integration/storage-mocks'
import { withObservabilityRequest } from '@/utils/observability/request-context'

// The only external boundary in this area is Supabase storage, used by
// deleteCourseService to remove a course thumbnail. We mock just that; the DB
// stays real via the `@/db` alias and authz resolves from real seeded rows.
// See docs/TESTING_GUIDE.md / ADR 0009.
const mocks = vi.hoisted(() => ({
  createSignedUrls: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUrls: mocks.createSignedUrls,
        remove: mocks.remove,
      }),
    },
  }),
}))

beforeEach(() => {
  resetCreateSignedUrlsMock(mocks.createSignedUrls)
  mocks.remove
    .mockReset()
    .mockResolvedValue({ data: [{ name: 'removed' }], error: null })
})

afterEach(() => {
  vi.restoreAllMocks()
  setAuthorizationService(new DefaultAuthorizationService())
})

async function seedCourseWithTeacher() {
  const teacherId = await seedProfile({ role: 'teacher' })
  const courseId = await seedCourse()
  await seedCourseTeacher(courseId, teacherId)
  const lessonId = await seedLesson({ courseId, isPublished: true })
  return { teacherId, courseId, lessonId }
}

describe('getCoursesService (integration)', () => {
  it('logs a redacted list-read event with safe counts', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse({ title: 'Private Course' })
    await seedCourseTeacher(courseId, teacherId)
    await seedLesson({
      courseId,
      isPublished: true,
      content: 'Private lesson content',
    })
    await seedLesson({
      courseId,
      isPublished: false,
      content: 'Private draft content',
    })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'course-list-request' },
      }),
      () => getCoursesService(teacherId),
    )

    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('Private Course')
    expect(line).not.toContain('Private lesson content')
    expect(JSON.parse(line)).toMatchObject({
      event: 'course_read_loaded',
      path: 'serverFn:getCourses',
      requestId: 'course-list-request',
      actorId: teacherId,
      role: 'teacher',
      courseCount: 1,
      lessonCount: 2,
      status: 'success',
      durationMs: expect.any(Number),
    })
  })

  it('logs stable failure metadata and preserves repository errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actorId = await seedProfile({ role: 'student' })
    const repositoryError = new Error(
      'connectionString=secret; content=private lesson',
    )
    vi.spyOn(sharedRepository, 'findAllCourseRows').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'course-list-failure-request' },
        }),
        () => getCoursesService(actorId),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('private lesson')
    expect(JSON.parse(line)).toMatchObject({
      event: 'course_read_failed',
      path: 'serverFn:getCourses',
      requestId: 'course-list-failure-request',
      actorId,
      status: 'failure',
      errorCategory: 'course_read_persistence',
      durationMs: expect.any(Number),
    })
  })

  it('admin sees unpublished lessons', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse()
    await seedLesson({ courseId, isPublished: true })
    await seedLesson({ courseId, isPublished: false })

    const { courses, role } = await getCoursesService(adminId)

    expect(role).toBe('admin')
    expect(courses).toHaveLength(1)
    expect(courses[0].lessons).toHaveLength(2)
  })

  it('teacher sees drafts only for courses they manage', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const assignedCourseId = await seedCourse({ title: 'Assigned course' })
    const otherCourseId = await seedCourse({ title: 'Other course' })
    await seedCourseTeacher(assignedCourseId, teacherId)
    await seedLesson({ courseId: assignedCourseId, isPublished: true })
    await seedLesson({ courseId: assignedCourseId, isPublished: false })
    await seedLesson({ courseId: otherCourseId, isPublished: true })
    await seedLesson({ courseId: otherCourseId, isPublished: false })

    const { courses, role } = await getCoursesService(teacherId)

    expect(role).toBe('teacher')
    expect(
      courses.find((course) => course.id === assignedCourseId)?.lessons,
    ).toHaveLength(2)
    expect(
      courses.find((course) => course.id === otherCourseId)?.lessons,
    ).toHaveLength(1)
  })

  it('hides unpublished courses from non-managers', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const teacherId = await seedProfile({ role: 'teacher' })
    const adminId = await seedProfile({ role: 'admin' })
    const draftId = await seedCourse({
      title: 'Draft course',
      isPublished: false,
    })
    const managedDraftId = await seedCourse({
      title: 'Managed draft',
      isPublished: false,
    })
    const publishedId = await seedCourse({
      title: 'Published course',
      isPublished: true,
    })
    await seedCourseTeacher(managedDraftId, teacherId)

    const studentCourseIds = (await getCoursesService(studentId)).courses.map(
      (course) => course.id,
    )
    expect(studentCourseIds).toContain(publishedId)
    expect(studentCourseIds).not.toContain(draftId)
    expect(studentCourseIds).not.toContain(managedDraftId)

    const teacherCourseIds = (await getCoursesService(teacherId)).courses.map(
      (course) => course.id,
    )
    expect(teacherCourseIds).toContain(publishedId)
    expect(teacherCourseIds).toContain(managedDraftId)
    expect(teacherCourseIds).not.toContain(draftId)

    const adminCourseIds = (await getCoursesService(adminId)).courses.map(
      (course) => course.id,
    )
    expect(adminCourseIds).toEqual(
      expect.arrayContaining([publishedId, draftId, managedDraftId]),
    )
  })

  it('student sees only published lessons with progress fields', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    await seedLesson({ courseId, isPublished: true })
    await seedLesson({ courseId, isPublished: false })

    const { courses, role } = await getCoursesService(studentId)

    expect(role).toBe('student')
    expect(courses[0].lessons).toHaveLength(1)
    expect(courses[0]).toMatchObject({
      totalAssignments: expect.any(Number),
      submittedAssignments: expect.any(Number),
      gradedAssignments: expect.any(Number),
    })
  })

  it('student progress counts only published assignments', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId, isPublished: true })
    const publishedId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: new Date('2020-01-01'),
    })
    await seedAssignment({ lessonId, status: 'draft' })
    await seedAssignment({ lessonId, status: 'closed' })
    await seedSubmission({
      assignmentId: publishedId,
      studentId,
      status: 'submitted',
    })

    const { courses } = await getCoursesService(studentId)

    expect(courses[0]).toMatchObject({
      totalAssignments: 1,
      submittedAssignments: 1,
      gradedAssignments: 0,
    })
  })
})

describe('getCourseService (integration)', () => {
  it('throws when the course does not exist', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      getCourseService({ courseId: randomUUID() }, studentId),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND', status: 404 })
    expect(infoSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('logs a redacted detail-read event with safe counts', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { courseId, teacherId } = await seedCourseWithTeacher()
    await seedMedia({
      uploaderId: teacherId,
      courseId,
      isPublished: true,
      title: 'Private media title',
    })
    const studentId = await seedProfile({ role: 'student' })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'course-detail-request' },
      }),
      () => getCourseService({ courseId }, studentId),
    )

    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('Private media title')
    expect(JSON.parse(line)).toMatchObject({
      event: 'course_read_loaded',
      path: 'serverFn:getCourse',
      requestId: 'course-detail-request',
      actorId: studentId,
      courseId,
      role: 'student',
      lessonCount: 1,
      mediaCount: 1,
      status: 'success',
      durationMs: expect.any(Number),
    })
  })

  it('teacher sees all lessons and a manage-capable permissions object', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, teacherId)
    await seedLesson({ courseId, isPublished: true })
    await seedLesson({ courseId, isPublished: false })

    const result = await getCourseService({ courseId }, teacherId)

    expect(result.role).toBe('teacher')
    expect(result.course.lessons).toHaveLength(2)
    expect(result.permissions.canManage).toBe(true)
    expect(result.completedLessonIds).toEqual([])
  })

  it('rejects unpublished courses for non-managers and allows managers', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const outsiderId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse({ isPublished: false })
    await seedCourseTeacher(courseId, teacherId)

    await expect(
      getCourseService({ courseId }, studentId),
    ).rejects.toMatchObject({ status: 403 })
    await expect(
      getCourseService({ courseId }, outsiderId),
    ).rejects.toMatchObject({ status: 403 })

    const managed = await getCourseService({ courseId }, teacherId)
    expect(managed.permissions.canManage).toBe(true)

    const admin = await getCourseService({ courseId }, adminId)
    expect(admin.course.id).toBe(courseId)
  })

  it('unassigned teacher sees only published course content', async () => {
    const assignedTeacherId = await seedProfile({ role: 'teacher' })
    const outsiderTeacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, assignedTeacherId)
    await seedLesson({ courseId, isPublished: true })
    await seedLesson({ courseId, isPublished: false })
    await seedMedia({
      uploaderId: assignedTeacherId,
      courseId,
      isPublished: true,
    })
    await seedMedia({
      uploaderId: assignedTeacherId,
      courseId,
      isPublished: false,
    })

    const result = await getCourseService({ courseId }, outsiderTeacherId)

    expect(result.course.lessons).toHaveLength(1)
    expect(result.course.mediaFiles).toHaveLength(1)
    expect(result.course.mediaFiles[0].isPublished).toBe(true)
    expect(result.permissions).toMatchObject({
      isCourseTeacher: false,
      canManage: false,
    })
  })

  it('student sees only published lessons and their completed-lesson ids', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const publishedLessonId = await seedLesson({ courseId, isPublished: true })
    await seedLesson({ courseId, isPublished: false })
    const assignmentId = await seedAssignment({
      lessonId: publishedLessonId,
      status: 'published',
    })
    await seedSubmission({
      assignmentId,
      studentId,
      status: 'submitted',
      grade: 90,
    })

    const result = await getCourseService({ courseId }, studentId)

    expect(result.role).toBe('student')
    expect(result.course.lessons).toHaveLength(1)
    expect(result.completedLessonIds).toContain(publishedLessonId)
  })

  it('keeps a lesson incomplete while any published assignment is ungraded', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId, isPublished: true })
    const gradedAssignmentId = await seedAssignment({
      lessonId,
      status: 'published',
    })
    await seedAssignment({ lessonId, status: 'published' })
    await seedSubmission({
      assignmentId: gradedAssignmentId,
      studentId,
      status: 'submitted',
      grade: 90,
    })

    const result = await getCourseService({ courseId }, studentId)

    expect(result.completedLessonIds).not.toContain(lessonId)
  })

  it('keeps a lesson incomplete when a submission exists but is ungraded', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId, isPublished: true })
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
    })
    await seedSubmission({
      assignmentId,
      studentId,
      status: 'submitted',
    })

    const result = await getCourseService({ courseId }, studentId)

    expect(result.completedLessonIds).not.toContain(lessonId)
  })

  it('ignores draft and closed assignments when deriving lesson completion', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId, isPublished: true })
    const publishedId = await seedAssignment({ lessonId, status: 'published' })
    await seedAssignment({ lessonId, status: 'draft' })
    await seedAssignment({ lessonId, status: 'closed' })
    await seedSubmission({
      assignmentId: publishedId,
      studentId,
      status: 'submitted',
      grade: 90,
    })

    const result = await getCourseService({ courseId }, studentId)

    expect(result.completedLessonIds).toContain(lessonId)
  })

  it('never completes a lesson that has no published assignments', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId, isPublished: true })

    const result = await getCourseService({ courseId }, studentId)

    expect(result.completedLessonIds).not.toContain(lessonId)
  })

  it('scopes completion to the viewing student', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const otherStudentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId, isPublished: true })
    const assignmentId = await seedAssignment({ lessonId, status: 'published' })
    await seedSubmission({
      assignmentId,
      studentId: otherStudentId,
      status: 'submitted',
      grade: 90,
    })

    const result = await getCourseService({ courseId }, studentId)

    expect(result.completedLessonIds).not.toContain(lessonId)
  })

  it('student course detail counts only published assignments', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId, isPublished: true })
    const publishedId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: new Date('2020-01-01'),
    })
    await seedAssignment({ lessonId, status: 'draft' })
    await seedAssignment({ lessonId, status: 'closed' })
    await seedSubmission({
      assignmentId: publishedId,
      studentId,
      status: 'graded',
      grade: 90,
    })

    const result = await getCourseService({ courseId }, studentId)

    expect(result.assignmentData).toEqual({
      totalAssignments: 1,
      submittedCount: 0,
      gradedCount: 1,
    })
  })
})

describe('lesson authorization preflight telemetry (integration)', () => {
  it.each([
    {
      name: 'lesson creation',
      event: 'lesson_create_failed',
      path: 'serverFn:createLesson',
      run: async (actorId: string) => {
        await createLessonService(
          { courseId: randomUUID(), title: 'Private lesson', orderIndex: 0 },
          actorId,
        )
      },
    },
    {
      name: 'lesson update',
      event: 'lesson_update_failed',
      path: 'serverFn:updateLesson',
      run: async (actorId: string) => {
        await updateLessonService(
          {
            courseId: randomUUID(),
            lessonId: randomUUID(),
            title: 'Private lesson',
          },
          actorId,
        )
      },
    },
    {
      name: 'lesson deletion',
      event: 'lesson_delete_failed',
      path: 'serverFn:deleteLesson',
      run: async (actorId: string) => {
        await deleteLessonService(
          { courseId: randomUUID(), lessonId: randomUUID() },
          actorId,
        )
      },
    },
  ])(
    'logs unexpected $name authorization failures without raw details',
    async ({ event, path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const repositoryError = new Error(
        'authorization connectionString=secret; lesson=private',
      )
      const rejectingService: AuthorizationService = {
        hasRole: vi.fn().mockRejectedValue(repositoryError),
        isRole: vi.fn(),
        getRole: vi.fn(),
        isAdmin: vi.fn(),
        canPerformAction: vi.fn().mockRejectedValue(repositoryError),
        isAllowedToPerformAction: vi.fn(),
      }
      setAuthorizationService(rejectingService)

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/lesson-mutation', {
            headers: { 'x-request-id': `lesson-auth-${path}` },
          }),
          () => run(randomUUID()),
        ),
      ).rejects.toBe(repositoryError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      const eventLine = serialized
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .find((entry) => entry.event === event)
      expect(eventLine).toMatchObject({
        event,
        path,
        requestId: `lesson-auth-${path}`,
        status: 'failure',
        errorCategory: 'lesson_authorization_persistence',
        durationMs: expect.any(Number),
      })
      expect(serialized.join('\n')).not.toContain('connectionString')
      expect(serialized.join('\n')).not.toContain('lesson=private')
    },
  )

  it('keeps expected authorization denials out of operation telemetry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const denial = new AuthorizationError('course access required')
    setAuthorizationService({
      hasRole: vi.fn().mockRejectedValue(denial),
      isRole: vi.fn(),
      getRole: vi.fn(),
      isAdmin: vi.fn(),
      canPerformAction: vi.fn().mockRejectedValue(denial),
      isAllowedToPerformAction: vi.fn(),
    })

    await expect(
      createLessonService(
        { courseId: randomUUID(), title: 'Denied lesson', orderIndex: 0 },
        randomUUID(),
      ),
    ).rejects.toBe(denial)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('createCourseService (integration)', () => {
  it('admin creates a course without teachers', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })

    const { course } = await createCourseService(
      { title: 'New Course', description: 'desc', orderIndex: 0 },
      adminId,
    )

    expect(course.title).toBe('New Course')
    expect(course.isPublished).toBe(false)
    expect(JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      event: 'course_created',
      actorId: adminId,
      courseId: course.id,
      status: 'success',
      published: false,
    })
  })

  it('stores canonical thumbnail path and returns signed display URL', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const inputUrl =
      `https://x.supabase.co/storage/v1/object/sign/course-thumbnails/` +
      `${adminId}/thumb.png?token=x`

    const { course } = await createCourseService(
      {
        title: 'Private Thumbnail',
        description: 'desc',
        orderIndex: 0,
        thumbnailUrl: inputUrl,
      },
      adminId,
    )

    expect(course.thumbnailUrl).toBe(`https://signed/${adminId}/thumb.png`)
    expect((await findCourseById(course.id))?.thumbnailUrl).toBe(
      `${adminId}/thumb.png`,
    )
  })

  it('admin creates a course with a valid teacher pair', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const teacher1Id = await seedProfile({ role: 'teacher' })
    const teacher2Id = await seedProfile({ role: 'teacher' })

    const { course } = await createCourseService(
      {
        title: 'Paired Course',
        description: 'desc',
        orderIndex: 0,
        teacher1Id,
        teacher2Id,
      },
      adminId,
    )

    const teacherIds = await findTeacherIdsByCourseId(course.id)
    expect(teacherIds).toHaveLength(2)
  })

  it('admin creates a course with an admin in the teacher pair', async () => {
    const creatorAdminId = await seedProfile({ role: 'admin' })
    const teacherAdminId = await seedProfile({ role: 'admin' })
    const teacherId = await seedProfile({ role: 'teacher' })

    const { course } = await createCourseService(
      {
        title: 'Admin-Taught Course',
        description: 'desc',
        orderIndex: 0,
        teacher1Id: teacherAdminId,
        teacher2Id: teacherId,
      },
      creatorAdminId,
    )

    const teacherIds = await findTeacherIdsByCourseId(course.id)
    expect(teacherIds).toEqual(
      expect.arrayContaining([teacherAdminId, teacherId]),
    )
  })

  it('rejects assigned teachers without leaving a course row', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const teacher1Id = await seedProfile({ role: 'teacher' })
    const teacher2Id = await seedProfile({ role: 'teacher' })
    const existingCourseId = await seedCourse()
    await seedCourseTeacher(existingCourseId, teacher1Id)

    await expect(
      createCourseService(
        {
          title: 'Must Roll Back',
          description: 'desc',
          orderIndex: 0,
          teacher1Id,
          teacher2Id,
        },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 })

    expect(await sharedRepository.findAllCourseRows()).not.toContainEqual(
      expect.objectContaining({ title: 'Must Roll Back' }),
    )
  })

  it('rolls back the course row when a concurrent assignment conflicts', async () => {
    const assignedTeacherId = await seedProfile({ role: 'teacher' })
    const availableTeacherId = await seedProfile({ role: 'teacher' })
    const existingCourseId = await seedCourse()
    await seedCourseTeacher(existingCourseId, assignedTeacherId)

    const db = await getDb()
    await expect(
      db.transaction(async (tx) => {
        const course = await insertCourseInTransaction(tx, {
          title: 'Atomic Course',
          description: 'desc',
          thumbnailUrl: null,
          isPublished: false,
          orderIndex: 0,
        })
        await insertCourseTeacherAssignmentsInTransaction(tx, course.id, [
          assignedTeacherId,
          availableTeacherId,
        ])
      }),
    ).rejects.toThrow()

    expect(await sharedRepository.findAllCourseRows()).not.toContainEqual(
      expect.objectContaining({ title: 'Atomic Course' }),
    )
  })

  it('rejects a non-admin caller', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(
      createCourseService(
        { title: 'x', description: 'd', orderIndex: 0 },
        teacherId,
      ),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
  })

  it('rejects when only one teacher is supplied', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const teacher1Id = await seedProfile({ role: 'teacher' })

    await expect(
      createCourseService(
        { title: 'x', description: 'd', orderIndex: 0, teacher1Id },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'TEACHER_PAIR_INVALID', status: 400 })
  })

  it('rejects the same teacher assigned twice', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(
      createCourseService(
        {
          title: 'x',
          description: 'd',
          orderIndex: 0,
          teacher1Id: teacherId,
          teacher2Id: teacherId,
        },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'TEACHER_PAIR_INVALID', status: 400 })
  })

  it('rejects a teacher pair where one is not a teacher', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      createCourseService(
        {
          title: 'x',
          description: 'd',
          orderIndex: 0,
          teacher1Id: teacherId,
          teacher2Id: studentId,
        },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 })
  })
})

describe('updateCourseService (integration)', () => {
  it('admin updates the course and reassigns teachers', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const teacher1Id = await seedProfile({ role: 'teacher' })
    const teacher2Id = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse({ title: 'Old' })

    const { course } = await updateCourseService(
      {
        courseId,
        title: 'Updated',
        description: 'desc',
        teacher1Id,
        teacher2Id,
      },
      adminId,
    )

    expect(course.title).toBe('Updated')
    expect(JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      event: 'course_updated',
      actorId: adminId,
      courseId,
      status: 'success',
    })
    const teacherIds = await findTeacherIdsByCourseId(courseId)
    expect(teacherIds).toHaveLength(2)
  })

  it('course teacher (non-admin) may update via editCourse permission', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse({ title: 'Old' })
    await seedCourseTeacher(courseId, teacherId)

    const { course } = await updateCourseService(
      { courseId, title: 'Updated', description: 'desc' },
      teacherId,
    )

    expect(course.title).toBe('Updated')
  })

  it('rejects a non-admin without course permission', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()

    await expect(
      updateCourseService(
        { courseId, title: 'x', description: 'd' },
        teacherId,
      ),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
  })
})

describe('deleteCourseService (integration)', () => {
  it('admin deletes a course without a thumbnail', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse()

    await deleteCourseService({ courseId }, adminId)

    expect(await findCourseById(courseId)).toBeUndefined()
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      event: 'course_deleted',
      actorId: adminId,
      courseId,
      status: 'success',
    })
  })

  it('admin deletes a course and removes its thumbnail from storage', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse({
      thumbnailUrl: `${adminId}/thumb.png`,
    })

    await deleteCourseService({ courseId }, adminId)

    expect(mocks.remove).toHaveBeenCalledWith([`${adminId}/thumb.png`])
    expect(await findCourseById(courseId)).toBeUndefined()
  })

  it('surfaces a storage failure and does not delete the course', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse({
      thumbnailUrl: `${adminId}/thumb.png`,
    })
    mocks.remove.mockResolvedValue({ error: { message: 'storage down' } })

    await expect(
      deleteCourseService({ courseId }, adminId),
    ).rejects.toMatchObject({ code: 'STORAGE_OPERATION_FAILED', status: 500 })
    expect(await findCourseById(courseId)).toBeDefined()
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('course_delete_failed'),
    )
    expect(errorSpy.mock.calls.at(-1)?.[0]).not.toContain('storage down')
  })

  it('throws when the course does not exist', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await expect(
      deleteCourseService({ courseId: randomUUID() }, adminId),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND', status: 404 })
  })

  it('rejects a non-admin without course permission', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()

    await expect(
      deleteCourseService({ courseId }, teacherId),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
  })
})

describe('course authorization preflight telemetry (integration)', () => {
  it('logs unexpected create profile failures without raw details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actorId = randomUUID()
    const repositoryError = new Error(
      'course profile connectionString=secret; email=course@test.dev',
    )
    vi.spyOn(authUtils, 'getUserProfile').mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/courses', {
          headers: { 'x-request-id': 'course-create-profile-failure' },
        }),
        () =>
          createCourseService(
            {
              title: 'Private course',
              description: 'Private details',
              orderIndex: 0,
            },
            actorId,
          ),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'course_create_failed',
      path: 'serverFn:createCourse',
      requestId: 'course-create-profile-failure',
      actorId,
      status: 'failure',
      errorCategory: 'course_authorization_persistence',
      durationMs: expect.any(Number),
    })
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('course@test.dev')
  })

  it.each([
    {
      name: 'update',
      event: 'course_update_failed',
      path: 'serverFn:updateCourse',
      run: (actorId: string): Promise<unknown> =>
        updateCourseService(
          { courseId: randomUUID(), title: 'Private', description: 'Details' },
          actorId,
        ),
    },
    {
      name: 'delete',
      event: 'course_delete_failed',
      path: 'serverFn:deleteCourse',
      run: (actorId: string): Promise<unknown> =>
        deleteCourseService({ courseId: randomUUID() }, actorId),
    },
  ])(
    'logs unexpected $name role-read failures without raw details',
    async ({ event, path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const repositoryError = new Error(
        'course role connectionString=secret; email=course-role@test.dev',
      )
      setAuthorizationService({
        isAdmin: vi.fn().mockRejectedValue(repositoryError),
      } as unknown as AuthorizationService)

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/courses', {
            headers: { 'x-request-id': `course-role-${path}` },
          }),
          () => run(randomUUID()),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(JSON.parse(line)).toMatchObject({
        event,
        path,
        requestId: `course-role-${path}`,
        status: 'failure',
        errorCategory: 'course_authorization_persistence',
        durationMs: expect.any(Number),
      })
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('course-role@test.dev')
    },
  )

  it.each([
    {
      name: 'update',
      event: 'course_update_failed',
      path: 'serverFn:updateCourse',
      run: (actorId: string): Promise<unknown> =>
        updateCourseService(
          { courseId: randomUUID(), title: 'Private', description: 'Details' },
          actorId,
        ),
    },
    {
      name: 'delete',
      event: 'course_delete_failed',
      path: 'serverFn:deleteCourse',
      run: (actorId: string): Promise<unknown> =>
        deleteCourseService({ courseId: randomUUID() }, actorId),
    },
  ])(
    'logs unexpected $name resource-authorization failures without raw details',
    async ({ event, path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const repositoryError = new Error(
        'course access connectionString=secret; email=course-access@test.dev',
      )
      setAuthorizationService({
        isAdmin: vi.fn().mockResolvedValue(false),
        canPerformAction: vi.fn().mockRejectedValue(repositoryError),
      } as unknown as AuthorizationService)

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/courses', {
            headers: { 'x-request-id': `course-access-${path}` },
          }),
          () => run(randomUUID()),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(JSON.parse(line)).toMatchObject({
        event,
        path,
        requestId: `course-access-${path}`,
        status: 'failure',
        errorCategory: 'course_authorization_persistence',
        durationMs: expect.any(Number),
      })
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('course-access@test.dev')
    },
  )

  it('logs unexpected course-teacher assignment role failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error(
      'course assignment connectionString=secret; email=teacher-pair@test.dev',
    )
    setAuthorizationService({
      hasRole: vi.fn().mockRejectedValue(repositoryError),
    } as unknown as AuthorizationService)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/course-teachers', {
          headers: { 'x-request-id': 'course-teacher-role-failure' },
        }),
        () =>
          updateCourseTeachersService(
            {
              courseId: randomUUID(),
              teacher1Id: randomUUID(),
              teacher2Id: randomUUID(),
            },
            randomUUID(),
          ),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'course_teachers_update_failed',
      path: 'serverFn:updateCourseTeachers',
      requestId: 'course-teacher-role-failure',
      status: 'failure',
      errorCategory: 'course_teacher_assignment_authorization_persistence',
      durationMs: expect.any(Number),
    })
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('teacher-pair@test.dev')
  })

  it('keeps expected course authorization denials out of error telemetry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const denial = new AuthorizationError('course access required')
    setAuthorizationService({
      hasRole: vi.fn().mockRejectedValue(denial),
      isAdmin: vi.fn().mockResolvedValue(false),
      canPerformAction: vi.fn().mockRejectedValue(denial),
    } as unknown as AuthorizationService)

    await expect(
      updateCourseService(
        { courseId: randomUUID(), title: 'Denied', description: 'Denied' },
        randomUUID(),
      ),
    ).rejects.toBe(denial)
    await expect(
      updateCourseTeachersService(
        {
          courseId: randomUUID(),
          teacher1Id: randomUUID(),
          teacher2Id: randomUUID(),
        },
        randomUUID(),
      ),
    ).rejects.toBe(denial)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('createLessonService (integration)', () => {
  it('course teacher creates a lesson (defaults to unpublished)', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, teacherId)

    const { lesson } = await createLessonService(
      { courseId, title: 'Lesson 1', orderIndex: 0 },
      teacherId,
    )

    expect(lesson.title).toBe('Lesson 1')
    expect(lesson.courseId).toBe(courseId)
    expect(lesson.isPublished).toBe(false)
    expect(JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      event: 'lesson_created',
      actorId: teacherId,
      courseId,
      lessonId: lesson.id,
      status: 'success',
    })
  })

  it('rejects a user without course permission', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()

    await expect(
      createLessonService({ courseId, title: 'x', orderIndex: 0 }, teacherId),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
  })
})

describe('updateLessonService (integration)', () => {
  it('course teacher updates a lesson', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, teacherId)
    const lessonId = await seedLesson({ courseId, title: 'Old' })

    const { lesson } = await updateLessonService(
      { lessonId, courseId, title: 'New', orderIndex: 1 },
      teacherId,
    )

    expect(lesson.title).toBe('New')
    expect(JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      event: 'lesson_updated',
      actorId: teacherId,
      courseId,
      lessonId,
      status: 'success',
    })
  })

  it('rejects a user without course permission', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId })

    await expect(
      updateLessonService({ lessonId, courseId, title: 'x' }, teacherId),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
  })
})

describe('deleteLessonService (integration)', () => {
  it('course teacher deletes a lesson', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, teacherId)
    const lessonId = await seedLesson({ courseId })

    const result = await deleteLessonService({ lessonId, courseId }, teacherId)

    expect(result).toEqual({ success: true, lessonId })
    expect(JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      event: 'lesson_deleted',
      actorId: teacherId,
      courseId,
      lessonId,
      status: 'success',
    })
  })

  it('rejects a user without course permission', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId })

    await expect(
      deleteLessonService({ lessonId, courseId }, teacherId),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
  })
})

describe('getUpcomingLessonsService (integration)', () => {
  it('requires a persisted profile before reading upcoming lessons', async () => {
    await expect(
      getUpcomingLessonsService('00000000-0000-4000-8000-000000000001'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('logs a redacted list-read event with request correlation and safe counts', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const courseId = await seedCourse({ title: 'Private upcoming course' })
    await seedLesson({
      courseId,
      title: 'Private upcoming lesson',
      content: 'Private lesson content',
      isPublished: true,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    const userId = await seedProfile({ role: 'student' })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'upcoming-lessons-request' },
      }),
      () => getUpcomingLessonsService(userId),
    )

    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    const event = JSON.parse(line) as Record<string, unknown>
    expect(event).toMatchObject({
      event: 'upcoming_lessons_loaded',
      requestId: 'upcoming-lessons-request',
      actorId: userId,
      lessonCount: 1,
      status: 'success',
    })
    expect(event.durationMs).toEqual(expect.any(Number))
    expect(line).not.toContain('Private upcoming course')
    expect(line).not.toContain('Private upcoming lesson')
    expect(line).not.toContain('Private lesson content')
  })

  it('logs persistence failures without changing the original error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error('upcoming lesson database secret')
    vi.spyOn(sharedRepository, 'findUpcomingLessons').mockRejectedValueOnce(
      repositoryError,
    )
    const userId = await seedProfile({ role: 'student' })

    await expect(getUpcomingLessonsService(userId)).rejects.toBe(
      repositoryError,
    )

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'upcoming_lessons_load_failed',
      actorId: userId,
      status: 'failure',
      errorCategory: 'upcoming_lessons_read_persistence',
      durationMs: expect.any(Number),
    })
    expect(line).not.toContain('upcoming lesson database secret')
  })

  it('returns only future, published lessons', async () => {
    const userId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const upcomingId = await seedLesson({
      courseId,
      isPublished: true,
      scheduledTime: future,
    })
    await seedLesson({ courseId, isPublished: false, scheduledTime: future })
    await seedLesson({ courseId, isPublished: true, scheduledTime: past })

    const { lessons } = await getUpcomingLessonsService(userId)

    expect(lessons).toHaveLength(1)
    expect(lessons[0].id).toBe(upcomingId)
  })

  it('returns an empty list when nothing is scheduled', async () => {
    const userId = await seedProfile({ role: 'student' })

    const { lessons } = await getUpcomingLessonsService(userId)

    expect(lessons).toEqual([])
  })
})

describe('getCalendarEventsService (integration)', () => {
  it('logs safe read counts and request correlation', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const userId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse({ title: 'Private course calendar' })
    const lessonId = await seedLesson({
      courseId,
      isPublished: true,
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    await seedAssignment({ lessonId, status: 'published' })

    await withObservabilityRequest(
      new Request('https://christ-dina.org/course-calendar', {
        headers: { 'x-request-id': 'course-calendar-read' },
      }),
      () => getCalendarEventsService(userId),
    )

    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('Private course calendar')
    expect(JSON.parse(line)).toMatchObject({
      event: 'course_calendar_events_loaded',
      path: 'serverFn:getCalendarEvents',
      requestId: 'course-calendar-read',
      actorId: userId,
      courseCount: 1,
      lessonEventCount: 1,
      assignmentEventCount: 1,
      eventCount: 2,
      status: 'success',
      durationMs: expect.any(Number),
    })
  })

  it.each([
    {
      name: 'course ID read',
      category: 'course_calendar_read_persistence',
      mock: (error: Error) =>
        vi
          .spyOn(sharedRepository, 'findAllCourseIds')
          .mockRejectedValueOnce(error),
      seedCourse: false,
    },
    {
      name: 'lesson calendar read',
      category: 'course_calendar_read_persistence',
      mock: (error: Error) =>
        vi
          .spyOn(sharedRepository, 'findLessonsByCourseIds')
          .mockRejectedValueOnce(error),
      seedCourse: true,
    },
    {
      name: 'assignment calendar read',
      category: 'course_calendar_read_persistence',
      mock: (error: Error) =>
        vi
          .spyOn(sharedRepository, 'findAssignmentsByLessonIds')
          .mockRejectedValueOnce(error),
      seedCourse: true,
    },
  ])(
    'logs $name failures without raw persistence details',
    async ({ category, mock, seedCourse: shouldSeedCourse }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const userId = await seedProfile({ role: 'student' })
      if (shouldSeedCourse) await seedCourse()
      const repositoryError = new Error(
        `${category} connectionString=secret; title=private`,
      )
      mock(repositoryError)

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/course-calendar', {
            headers: { 'x-request-id': `course-calendar-${category}` },
          }),
          () => getCalendarEventsService(userId),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('title=private')
      expect(JSON.parse(line)).toMatchObject({
        event: 'course_calendar_events_load_failed',
        path: 'serverFn:getCalendarEvents',
        requestId: `course-calendar-${category}`,
        actorId: userId,
        status: 'failure',
        errorCategory: category,
        durationMs: expect.any(Number),
      })
    },
  )

  it('merges lessons and assignments and drops lessons without a schedule', async () => {
    const userId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const scheduled = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const scheduledLessonId = await seedLesson({
      courseId,
      isPublished: true,
      scheduledTime: scheduled,
    })
    const unscheduledLessonId = await seedLesson({ courseId })
    const lessonForAssignment = await seedLesson({ courseId })
    await seedAssignment({
      lessonId: lessonForAssignment,
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    })

    const { events } = await getCalendarEventsService(userId)

    const ids = events.map((e) => e.id)
    expect(ids).toContain(scheduledLessonId)
    expect(ids).not.toContain(unscheduledLessonId)
    expect(events.some((e) => e.type === 'assignment')).toBe(true)
  })

  it('returns an empty list when there are no courses', async () => {
    const userId = await seedProfile({ role: 'student' })

    const { events } = await getCalendarEventsService(userId)

    expect(events).toEqual([])
  })
})

describe('course read actor-profile telemetry (integration)', () => {
  it.each([
    {
      name: 'course list',
      requestId: 'course-list-profile-failure',
      event: 'course_read_failed',
      path: 'serverFn:getCourses',
      category: 'course_read_persistence',
      run: async (actorId: string) => {
        await getCoursesService(actorId)
      },
    },
    {
      name: 'course detail',
      requestId: 'course-detail-profile-failure',
      event: 'course_read_failed',
      path: 'serverFn:getCourse',
      category: 'course_read_persistence',
      run: async (actorId: string) => {
        await getCourseService({ courseId: randomUUID() }, actorId)
      },
    },
    {
      name: 'upcoming lessons',
      requestId: 'upcoming-lessons-profile-failure',
      event: 'upcoming_lessons_load_failed',
      path: 'serverFn:getUpcomingLessons',
      category: 'upcoming_lessons_read_persistence',
      run: async (actorId: string) => {
        await getUpcomingLessonsService(actorId)
      },
    },
    {
      name: 'course calendar',
      requestId: 'course-calendar-profile-failure',
      event: 'course_calendar_events_load_failed',
      path: 'serverFn:getCalendarEvents',
      category: 'course_calendar_read_persistence',
      run: async (actorId: string) => {
        await getCalendarEventsService(actorId)
      },
    },
    {
      name: 'course teachers',
      requestId: 'course-teachers-profile-failure',
      event: 'course_teachers_load_failed',
      path: 'serverFn:getCourseTeachers',
      category: 'course_teacher_read_persistence',
      run: async (actorId: string) => {
        await getCourseTeachersService({ courseId: randomUUID() }, actorId)
      },
    },
  ])(
    'logs unexpected $name actor-profile failures without raw details',
    async ({ requestId, event, path, category, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const actorId = randomUUID()
      const repositoryError = new Error(
        'actor profile connectionString=secret; email=actor@test.dev',
      )
      vi.spyOn(authUtils, 'getUserProfile').mockRejectedValueOnce(
        repositoryError,
      )

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/course-reads', {
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
        actorId,
        status: 'failure',
        errorCategory: category,
        durationMs: expect.any(Number),
      })
    },
  )
})

describe('validateTeacherPair (integration)', () => {
  it('resolves for two distinct teachers', async () => {
    const t1 = await seedProfile({ role: 'teacher' })
    const t2 = await seedProfile({ role: 'teacher' })

    await expect(validateTeacherPair(t1, t2)).resolves.toBeUndefined()
  })

  it('accepts an admin in the pair when allowAdmin is set', async () => {
    const teacher = await seedProfile({ role: 'teacher' })
    const admin = await seedProfile({ role: 'admin' })

    await expect(
      validateTeacherPair(teacher, admin, true),
    ).resolves.toBeUndefined()
  })

  it('rejects the same teacher twice', async () => {
    const t1 = await seedProfile({ role: 'teacher' })

    await expect(validateTeacherPair(t1, t1)).rejects.toMatchObject({
      code: 'TEACHER_PAIR_INVALID',
      status: 400,
    })
  })

  it('rejects a non-teacher role', async () => {
    const teacher = await seedProfile({ role: 'teacher' })
    const student = await seedProfile({ role: 'student' })

    await expect(validateTeacherPair(teacher, student)).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      status: 400,
    })
  })

  it('throws not found when a teacher is missing', async () => {
    const teacher = await seedProfile({ role: 'teacher' })

    await expect(
      validateTeacherPair(teacher, randomUUID()),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })
})

describe('assignTeachersToCourse (integration)', () => {
  it('replaces an existing pair with a new pair', async () => {
    const courseId = await seedCourse()
    const oldTeacher = await seedProfile({ role: 'teacher' })
    await seedCourseTeacher(courseId, oldTeacher)
    const t1 = await seedProfile({ role: 'teacher' })
    const t2 = await seedProfile({ role: 'teacher' })

    await assignTeachersToCourse(courseId, t1, t2)

    const teacherIds = await findTeacherIdsByCourseId(courseId)
    expect(teacherIds).toHaveLength(2)
    expect(teacherIds).toContain(t1)
    expect(teacherIds).toContain(t2)
    expect(teacherIds).not.toContain(oldTeacher)
  })
})

describe('getCourseTeachersService (integration)', () => {
  it('returns assigned teachers and logs safe read telemetry', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const userId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const teacherId = await seedProfile({
      role: 'teacher',
      fullName: 'Private Teacher',
      email: 'private.teacher@test.dev',
    })
    await seedCourseTeacher(courseId, teacherId)

    const { teachers } = await withObservabilityRequest(
      new Request('https://christ-dina.org/course-teachers', {
        headers: { 'x-request-id': 'course-teacher-read' },
      }),
      () => getCourseTeachersService({ courseId }, userId),
    )

    expect(teachers.map((t) => t.id)).toContain(teacherId)
    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('Private Teacher')
    expect(line).not.toContain('private.teacher@test.dev')
    expect(JSON.parse(line)).toMatchObject({
      event: 'course_teachers_loaded',
      path: 'serverFn:getCourseTeachers',
      requestId: 'course-teacher-read',
      actorId: userId,
      courseId,
      teacherCount: 1,
      status: 'success',
      durationMs: expect.any(Number),
    })
  })

  it('returns an empty list for a course with no teachers', async () => {
    const userId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()

    const { teachers } = await getCourseTeachersService({ courseId }, userId)

    expect(teachers).toEqual([])
  })

  it('logs stable persistence failures without raw errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const userId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const repositoryError = new Error('course teacher database secret')
    vi.spyOn(sharedRepository, 'findCourseTeacherRows').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/course-teachers', {
          headers: { 'x-request-id': 'course-teacher-read-failure' },
        }),
        () => getCourseTeachersService({ courseId }, userId),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('course teacher database secret')
    expect(JSON.parse(line)).toMatchObject({
      event: 'course_teachers_load_failed',
      path: 'serverFn:getCourseTeachers',
      requestId: 'course-teacher-read-failure',
      actorId: userId,
      courseId,
      status: 'failure',
      errorCategory: 'course_teacher_read_persistence',
      durationMs: expect.any(Number),
    })
  })
})

describe('updateCourseTeachersService (integration)', () => {
  it('admin assigns a teacher pair', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse()
    const t1 = await seedProfile({ role: 'teacher' })
    const t2 = await seedProfile({ role: 'teacher' })

    const result = await updateCourseTeachersService(
      { courseId, teacher1Id: t1, teacher2Id: t2 },
      adminId,
    )

    expect(result).toEqual({ success: true })
    expect(await findTeacherIdsByCourseId(courseId)).toHaveLength(2)
    expect(JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      event: 'course_teachers_updated',
      path: 'serverFn:updateCourseTeachers',
      status: 'success',
      actorId: adminId,
      courseId,
      teacher1Id: t1,
      teacher2Id: t2,
    })
  })

  it('rejects a non-admin caller', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    const t1 = await seedProfile({ role: 'teacher' })
    const t2 = await seedProfile({ role: 'teacher' })

    await expect(
      updateCourseTeachersService(
        { courseId, teacher1Id: t1, teacher2Id: t2 },
        teacherId,
      ),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
  })

  it('throws when the course does not exist', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const t1 = await seedProfile({ role: 'teacher' })
    const t2 = await seedProfile({ role: 'teacher' })

    await expect(
      updateCourseTeachersService(
        { courseId: randomUUID(), teacher1Id: t1, teacher2Id: t2 },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND', status: 404 })
    expect(infoSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
