import { describe, expect, it } from 'vitest'
import { createPostCreatedEvent } from './events'
import { getRecipients } from './recipients'
import {
  seedCourse,
  seedCourseTeacher,
  seedProfile,
} from '@/../test/integration/seed'

describe('notification recipient resolution (integration)', () => {
  it('uses shared profile and course-teacher seams without changing recipient rules', async () => {
    const actorId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const secondStudentId = await seedProfile({ role: 'student' })
    const otherTeacherId = await seedProfile({ role: 'teacher' })
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, actorId)
    await seedCourseTeacher(courseId, otherTeacherId)

    const generalRecipients = await getRecipients(
      createPostCreatedEvent(actorId, 'post-general', null, true),
    )
    expect(new Set(generalRecipients.recipientIds)).toEqual(
      new Set([studentId, secondStudentId, otherTeacherId, adminId]),
    )

    const courseRecipients = await getRecipients(
      createPostCreatedEvent(actorId, 'post-course', courseId, true),
    )
    expect(new Set(courseRecipients.recipientIds)).toEqual(
      new Set([studentId, secondStudentId, otherTeacherId]),
    )
  })
})
