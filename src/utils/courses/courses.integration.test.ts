import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  findCourseById,
  findCourseTeachers,
} from '@/utils/courses/repository'
import {
  seedCourse,
  seedCourseTeacher,
  seedAssignment,
  seedLesson,
  seedLessonProgress,
  seedProfile,
} from '@/../test/integration/seed'

// The only external boundary in this area is Supabase storage, used by
// deleteCourseService to remove a course thumbnail. We mock just that; the DB
// stays real via the `@/db` alias and authz resolves from real seeded rows.
// See docs/TESTING_GUIDE.md / ADR 0009.
const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseServerClient: () => ({
    storage: { from: () => ({ remove: mocks.remove }) },
  }),
}))

beforeEach(() => {
  mocks.remove.mockReset().mockResolvedValue({ error: null })
})

describe('getCoursesService (integration)', () => {
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
})

describe('getCourseService (integration)', () => {
  it('throws when the course does not exist', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      getCourseService({ courseId: randomUUID() }, studentId),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND', status: 404 })
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

  it('student sees only published lessons and their completed-lesson ids', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const publishedLessonId = await seedLesson({ courseId, isPublished: true })
    await seedLesson({ courseId, isPublished: false })
    await seedLessonProgress({
      studentId,
      lessonId: publishedLessonId,
      completed: true,
    })

    const result = await getCourseService({ courseId }, studentId)

    expect(result.role).toBe('student')
    expect(result.course.lessons).toHaveLength(1)
    expect(result.completedLessonIds).toContain(publishedLessonId)
  })
})

describe('createCourseService (integration)', () => {
  it('admin creates a course without teachers', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    const { course } = await createCourseService(
      { title: 'New Course', description: 'desc', orderIndex: 0 },
      adminId,
    )

    expect(course.title).toBe('New Course')
    expect(course.isPublished).toBe(false)
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

    const teachers = await findCourseTeachers(course.id)
    expect(teachers).toHaveLength(2)
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
    const teachers = await findCourseTeachers(courseId)
    expect(teachers).toHaveLength(2)
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
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse()

    await deleteCourseService({ courseId }, adminId)

    expect(await findCourseById(courseId)).toBeUndefined()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('admin deletes a course and removes its thumbnail from storage', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse({
      thumbnailUrl: 'https://cdn.test/bucket/thumb.png',
    })

    await deleteCourseService({ courseId }, adminId)

    expect(mocks.remove).toHaveBeenCalledWith(['thumb.png'])
    expect(await findCourseById(courseId)).toBeUndefined()
  })

  it('surfaces a storage failure and does not delete the course', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse({
      thumbnailUrl: 'https://cdn.test/bucket/thumb.png',
    })
    mocks.remove.mockResolvedValue({ error: { message: 'storage down' } })

    await expect(
      deleteCourseService({ courseId }, adminId),
    ).rejects.toMatchObject({ code: 'STORAGE_OPERATION_FAILED', status: 500 })
    expect(await findCourseById(courseId)).toBeDefined()
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

describe('createLessonService (integration)', () => {
  it('course teacher creates a lesson (defaults to unpublished)', async () => {
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
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, teacherId)
    const lessonId = await seedLesson({ courseId, title: 'Old' })

    const { lesson } = await updateLessonService(
      { lessonId, courseId, title: 'New', orderIndex: 1 },
      teacherId,
    )

    expect(lesson.title).toBe('New')
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
    const teacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, teacherId)
    const lessonId = await seedLesson({ courseId })

    const result = await deleteLessonService({ lessonId, courseId }, teacherId)

    expect(result).toEqual({ success: true, lessonId })
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

    const teachers = await findCourseTeachers(courseId)
    const ids = teachers.map((ct) => ct.teacher.id)
    expect(ids).toHaveLength(2)
    expect(ids).toContain(t1)
    expect(ids).toContain(t2)
    expect(ids).not.toContain(oldTeacher)
  })
})

describe('getCourseTeachersService (integration)', () => {
  it('returns the assigned teachers', async () => {
    const userId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const teacherId = await seedProfile({ role: 'teacher' })
    await seedCourseTeacher(courseId, teacherId)

    const { teachers } = await getCourseTeachersService({ courseId }, userId)

    expect(teachers.map((t) => t.id)).toContain(teacherId)
  })

  it('returns an empty list for a course with no teachers', async () => {
    const userId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()

    const { teachers } = await getCourseTeachersService({ courseId }, userId)

    expect(teachers).toEqual([])
  })
})

describe('updateCourseTeachersService (integration)', () => {
  it('admin assigns a teacher pair', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse()
    const t1 = await seedProfile({ role: 'teacher' })
    const t2 = await seedProfile({ role: 'teacher' })

    const result = await updateCourseTeachersService(
      { courseId, teacher1Id: t1, teacher2Id: t2 },
      adminId,
    )

    expect(result).toEqual({ success: true })
    expect(await findCourseTeachers(courseId)).toHaveLength(2)
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
    const adminId = await seedProfile({ role: 'admin' })
    const t1 = await seedProfile({ role: 'teacher' })
    const t2 = await seedProfile({ role: 'teacher' })

    await expect(
      updateCourseTeachersService(
        { courseId: randomUUID(), teacher1Id: t1, teacher2Id: t2 },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND', status: 404 })
  })
})
