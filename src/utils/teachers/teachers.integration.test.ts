import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getAllTeachersService,
  getTeachersService,
  isCourseTeacherService,
} from '@/utils/teachers/service/teachers.service'
import { AuthorizationError, NotFoundError } from '@/utils/errors'
import {
  seedCourse,
  seedCourseTeacher,
  seedProfile,
} from '@/../test/integration/seed'
import { withObservabilityRequest } from '@/utils/observability/request-context'
import * as teachersRepository from '@/utils/teachers/repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('teachers service (integration)', () => {
  describe('getTeachersService', () => {
    it('lists teacher- and admin-role profiles, excludes students', async () => {
      const teacherId = await seedProfile({ role: 'teacher' })
      const adminId = await seedProfile({ role: 'admin' })
      const studentId = await seedProfile({ role: 'student' })

      const { teachers } = await getTeachersService(teacherId)

      const ids = teachers.map((t) => t.id)
      expect(ids).toContain(teacherId)
      expect(ids).toContain(adminId)
      expect(ids).not.toContain(studentId)
    })

    it('joins the assigned course onto a teacher', async () => {
      const teacherId = await seedProfile({ role: 'teacher' })
      const courseId = await seedCourse({ title: 'Foundations' })
      await seedCourseTeacher(courseId, teacherId)

      const { teachers } = await getTeachersService(teacherId)

      const teacher = teachers.find((t) => t.id === teacherId)
      expect(teacher?.course).toMatchObject({
        id: courseId,
        title: 'Foundations',
      })
    })

    it('leaves course undefined for an unassigned teacher', async () => {
      const teacherId = await seedProfile({ role: 'teacher' })

      const { teachers } = await getTeachersService(teacherId)

      const teacher = teachers.find((t) => t.id === teacherId)
      expect(teacher?.course).toBeUndefined()
    })

    it('requires a persisted profile for direct service calls', async () => {
      await expect(getTeachersService(randomUUID())).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })

    it('logs redacted list telemetry with safe metadata', async () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const actorId = await seedProfile({ role: 'teacher' })
      await seedProfile({
        role: 'teacher',
        fullName: 'Private Teacher',
        email: 'private.teacher@test.dev',
      })

      await withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'teacher-directory-request' },
        }),
        () => getTeachersService(actorId),
      )

      const line = String(infoSpy.mock.calls.at(-1)?.[0])
      expect(line).not.toContain('Private Teacher')
      expect(line).not.toContain('private.teacher@test.dev')
      expect(JSON.parse(line)).toMatchObject({
        event: 'teacher_directory_loaded',
        path: 'serverFn:getTeachers',
        requestId: 'teacher-directory-request',
        actorId,
        teacherCount: 2,
        status: 'success',
        durationMs: expect.any(Number),
      })
    })

    it('logs stable failure metadata and preserves the repository error', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const actorId = await seedProfile({ role: 'teacher' })
      const repositoryError = new Error(
        'connectionString=secret; email=private.teacher@test.dev',
      )
      vi.spyOn(teachersRepository, 'findAllTeachers').mockRejectedValueOnce(
        repositoryError,
      )

      await expect(getTeachersService(actorId)).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('private.teacher@test.dev')
      expect(JSON.parse(line)).toMatchObject({
        event: 'teacher_directory_load_failed',
        path: 'serverFn:getTeachers',
        actorId,
        status: 'failure',
        errorCategory: 'teacher_directory_read_persistence',
        durationMs: expect.any(Number),
      })
    })
  })

  describe('getAllTeachersService', () => {
    it('returns the simple teacher list for an admin', async () => {
      const adminId = await seedProfile({ role: 'admin' })
      const teacherId = await seedProfile({
        role: 'teacher',
        email: 'lecturer@test.dev',
        fullName: 'Lecturer One',
      })

      const { teachers } = await getAllTeachersService(adminId)

      expect(teachers).toContainEqual(
        expect.objectContaining({
          id: teacherId,
          fullName: 'Lecturer One',
          email: 'lecturer@test.dev',
          role: 'teacher',
          courseId: null,
        }),
      )
    })

    it('includes the assigned course id', async () => {
      const adminId = await seedProfile({ role: 'admin' })
      const teacherId = await seedProfile({ role: 'teacher' })
      const courseId = await seedCourse()
      await seedCourseTeacher(courseId, teacherId)

      const { teachers } = await getAllTeachersService(adminId)

      expect(
        teachers.find((teacher) => teacher.id === teacherId)?.courseId,
      ).toBe(courseId)
    })

    it('rejects a non-admin caller', async () => {
      const studentId = await seedProfile({ role: 'student' })
      const teacherId = await seedProfile({ role: 'teacher' })

      await expect(getAllTeachersService(studentId)).rejects.toBeInstanceOf(
        AuthorizationError,
      )
      await expect(getAllTeachersService(teacherId)).rejects.toBeInstanceOf(
        AuthorizationError,
      )
    })

    it('logs the admin teacher-list read with a safe result count', async () => {
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
      const adminId = await seedProfile({ role: 'admin' })
      await seedProfile({
        role: 'teacher',
        fullName: 'Private Teacher',
        email: 'private.teacher@test.dev',
      })

      await withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'admin-teacher-list-request' },
        }),
        () => getAllTeachersService(adminId),
      )

      const line = String(infoSpy.mock.calls.at(-1)?.[0])
      expect(line).not.toContain('Private Teacher')
      expect(line).not.toContain('private.teacher@test.dev')
      expect(JSON.parse(line)).toMatchObject({
        event: 'teacher_directory_loaded',
        path: 'serverFn:getAllTeachers',
        requestId: 'admin-teacher-list-request',
        actorId: adminId,
        teacherCount: 2,
        status: 'success',
        durationMs: expect.any(Number),
      })
    })
  })

  describe('isCourseTeacherService', () => {
    it('returns true when the user teaches the course', async () => {
      const teacherId = await seedProfile({ role: 'teacher' })
      const courseId = await seedCourse()
      await seedCourseTeacher(courseId, teacherId)

      expect(await isCourseTeacherService(courseId, teacherId)).toEqual({
        isCourseTeacher: true,
      })
    })

    it('returns false when the user does not teach the course', async () => {
      const teacherId = await seedProfile({ role: 'teacher' })
      const courseId = await seedCourse()

      expect(await isCourseTeacherService(courseId, teacherId)).toEqual({
        isCourseTeacher: false,
      })
    })
  })
})
