import { describe, expect, it } from 'vitest'
import { getDb } from 'test/integration/db'
import type { CreateZoomLinkInput } from '@/schemas/zoomLink.schema'
import {
  createZoomLinkService,
  deleteZoomLinkService,
  getZoomLinksService,
  updateZoomLinkService,
} from '@/utils/zoomLink/service/zoomLink.service'
import { updateAssignmentTeacher } from '@/utils/discipleship/repository'
import { AuthorizationError, ValidationError } from '@/utils/errors'
import { zoomLinks } from '@/db/schema'
import {
  seedCourse,
  seedCourseTeacher,
  seedDiscipleshipAssignment,
  seedProfile,
} from '@/../test/integration/seed'

const makeGeneralInput = (
  overrides: Partial<CreateZoomLinkInput> = {},
): CreateZoomLinkInput =>
  ({
    title: 'General Lecture',
    section: 'general_class_lecture',
    zoomUrl: 'https://zoom.us/j/general',
    meetingId: '100',
    passcode: 'general-secret',
    ...overrides,
  }) as CreateZoomLinkInput

function makeTeacherInput(
  teacherId: string,
  overrides: Partial<CreateZoomLinkInput> = {},
): CreateZoomLinkInput {
  return {
    title: 'Teacher Session',
    section: 'teacher',
    teacherId,
    zoomUrl: 'https://zoom.us/j/teacher',
    meetingId: '200',
    passcode: 'teacher-secret',
    ...overrides,
  } as CreateZoomLinkInput
}

async function seedOwners() {
  const teacherA = await seedProfile({
    role: 'teacher',
    fullName: 'Teacher A',
  })
  const teacherB = await seedProfile({
    role: 'teacher',
    fullName: 'Teacher B',
  })
  return { teacherA, teacherB }
}

describe('zoomLink service (integration)', () => {
  it('database rejects invalid section-owner combinations', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const db = getDb()
    const shared = {
      title: 'Invalid',
      zoomUrl: 'https://zoom.us/j/invalid',
      meetingId: '0',
      passcode: 'invalid',
    }
    await expect(
      db.insert(zoomLinks).values({
        ...shared,
        section: 'general_class_lecture',
        teacherId,
      }),
    ).rejects.toThrow()
    await expect(
      db.insert(zoomLinks).values({ ...shared, section: 'teacher' }),
    ).rejects.toThrow()
  })

  it('admin creates multiple links per teacher and updates and deletes them', async () => {
    const adminId = await seedProfile({ role: 'admin', fullName: 'Admin' })
    const teacherId = await seedProfile({
      role: 'teacher',
      fullName: 'Teacher',
    })
    await createZoomLinkService(
      makeTeacherInput(teacherId, { title: 'One' }),
      adminId,
    )
    await createZoomLinkService(
      makeTeacherInput(teacherId, { title: 'Two' }),
      adminId,
    )

    const createdLinks = (await getZoomLinksService(adminId)).links
    const original = createdLinks[0]
    const other = createdLinks[1]
    await updateZoomLinkService(
      {
        ...makeTeacherInput(teacherId, { title: 'Updated' }),
        zoomLinkId: original.id,
      },
      adminId,
    )
    await deleteZoomLinkService({ zoomLinkId: other.id }, adminId)

    const payload = await getZoomLinksService(adminId)
    expect(payload.links).toHaveLength(1)
    expect(payload.links[0]).toMatchObject({
      id: original.id,
      title: 'Updated',
      section: 'teacher',
      teacherId,
      teacherName: 'Teacher',
    })
    expect(payload.links[0]).not.toHaveProperty('courseId')
    expect(payload.links[0]).not.toHaveProperty('courseTitle')
  })

  it('rejects student, missing, and unrelated-role owners', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const studentId = await seedProfile({ role: 'student' })
    await expect(
      createZoomLinkService(makeTeacherInput(studentId), adminId),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      createZoomLinkService(
        makeTeacherInput('11111111-1111-4111-8111-111111111111'),
        adminId,
      ),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('accepts an admin profile as owner', async () => {
    const adminId = await seedProfile({
      role: 'admin',
      fullName: 'Admin Owner',
    })
    await createZoomLinkService(makeTeacherInput(adminId), adminId)
    expect((await getZoomLinksService(adminId)).links[0].teacherId).toBe(
      adminId,
    )
  })

  it.each(['teacher', 'admin'] as const)(
    '%s receives every link',
    async (role) => {
      const adminId = await seedProfile({ role: 'admin' })
      const viewerId = role === 'admin' ? adminId : await seedProfile({ role })
      const { teacherA, teacherB } = await seedOwners()
      await createZoomLinkService(makeGeneralInput(), adminId)
      await createZoomLinkService(makeTeacherInput(teacherA), adminId)
      await createZoomLinkService(makeTeacherInput(teacherB), adminId)
      expect((await getZoomLinksService(viewerId)).links).toHaveLength(3)
    },
  )

  it('assigned student receives general plus only assigned teacher credentials', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const studentId = await seedProfile({ role: 'student' })
    const { teacherA, teacherB } = await seedOwners()
    await seedDiscipleshipAssignment({ studentId, teacherId: teacherA })
    await createZoomLinkService(makeGeneralInput(), adminId)
    await createZoomLinkService(
      makeTeacherInput(teacherA, { title: 'Mine' }),
      adminId,
    )
    await createZoomLinkService(
      makeTeacherInput(teacherB, {
        title: 'Foreign',
        zoomUrl: 'https://zoom.us/j/foreign',
        passcode: 'foreign-secret',
      }),
      adminId,
    )

    const payload = await getZoomLinksService(studentId)
    expect(payload.links.map((link) => link.title)).toEqual([
      'General Lecture',
      'Mine',
    ])
    expect(JSON.stringify(payload)).not.toContain('foreign-secret')
    expect(JSON.stringify(payload)).not.toContain('https://zoom.us/j/foreign')
    expect(payload.teachers).toEqual([])
  })

  it('unassigned student receives general links only', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const studentId = await seedProfile({ role: 'student' })
    const teacherId = await seedProfile({ role: 'teacher' })
    await createZoomLinkService(makeGeneralInput(), adminId)
    await createZoomLinkService(makeTeacherInput(teacherId), adminId)
    expect(
      (await getZoomLinksService(studentId)).links.map((link) => link.section),
    ).toEqual(['general_class_lecture'])
  })

  it('reflects reassignment on the next load', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const studentId = await seedProfile({ role: 'student' })
    const { teacherA, teacherB } = await seedOwners()
    await seedDiscipleshipAssignment({ studentId, teacherId: teacherA })
    await createZoomLinkService(
      makeTeacherInput(teacherA, { title: 'A' }),
      adminId,
    )
    await createZoomLinkService(
      makeTeacherInput(teacherB, { title: 'B' }),
      adminId,
    )

    expect((await getZoomLinksService(studentId)).links[0].title).toBe('A')
    await updateAssignmentTeacher(studentId, teacherB)
    expect((await getZoomLinksService(studentId)).links[0].title).toBe('B')
  })

  it('uses Teachers-page owner ordering and per-owner link ordering', async () => {
    const adminId = await seedProfile({ role: 'admin', fullName: 'Admin' })
    const { teacherA, teacherB } = await seedOwners()
    const courseA = await seedCourse({ title: 'Later', orderIndex: 2 })
    const courseB = await seedCourse({ title: 'Earlier', orderIndex: 1 })
    await seedCourseTeacher(courseA, teacherA)
    await seedCourseTeacher(courseB, teacherB)
    await createZoomLinkService(
      makeTeacherInput(teacherA, { title: 'A' }),
      adminId,
    )
    await createZoomLinkService(
      makeTeacherInput(teacherB, { title: 'Second', orderIndex: 1 }),
      adminId,
    )
    await createZoomLinkService(
      makeTeacherInput(teacherB, { title: 'First', orderIndex: 0 }),
      adminId,
    )

    const payload = await getZoomLinksService(adminId)
    expect(payload.links.map((link) => link.title)).toEqual([
      'First',
      'Second',
      'A',
    ])
    expect(payload.teachers.slice(0, 2).map((teacher) => teacher.id)).toEqual([
      teacherB,
      teacherA,
    ])
  })

  it('rejects a non-admin caller from mutations', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await expect(
      createZoomLinkService(makeGeneralInput(), teacherId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })
})
