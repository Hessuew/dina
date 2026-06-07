import { describe, expect, it } from 'vitest'
import {
  getAllTeachersService,
  getTeachersService,
  isCourseTeacherService,
} from '@/utils/teachers/service/teachers.service'
import { AuthorizationError } from '@/utils/errors'
import {
  seedCourse,
  seedCourseTeacher,
  seedProfile,
} from '../../../test/integration/seed'

describe('teachers service (integration)', () => {
  describe('getTeachersService', () => {
    it('lists teacher- and admin-role profiles, excludes students', async () => {
      const teacherId = await seedProfile({ role: 'teacher' })
      const adminId = await seedProfile({ role: 'admin' })
      const studentId = await seedProfile({ role: 'student' })

      const { teachers } = await getTeachersService()

      const ids = teachers.map((t) => t.id)
      expect(ids).toContain(teacherId)
      expect(ids).toContain(adminId)
      expect(ids).not.toContain(studentId)
    })

    it('joins the assigned course onto a teacher', async () => {
      const teacherId = await seedProfile({ role: 'teacher' })
      const courseId = await seedCourse({ title: 'Foundations' })
      await seedCourseTeacher(courseId, teacherId)

      const { teachers } = await getTeachersService()

      const teacher = teachers.find((t) => t.id === teacherId)
      expect(teacher?.course).toMatchObject({ id: courseId, title: 'Foundations' })
    })

    it('leaves course undefined for an unassigned teacher', async () => {
      const teacherId = await seedProfile({ role: 'teacher' })

      const { teachers } = await getTeachersService()

      const teacher = teachers.find((t) => t.id === teacherId)
      expect(teacher?.course).toBeUndefined()
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
        }),
      )
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
