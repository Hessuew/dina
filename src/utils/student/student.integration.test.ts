import { describe, expect, it } from 'vitest'
import {
  seedAssignment,
  seedCourse,
  seedLesson,
  seedProfile,
  seedSubmission,
} from '../../../test/integration/seed'
import {
  getStudentDetailService,
  getStudentsService,
} from '@/utils/student/service/student.service'
import { NotFoundError } from '@/utils/errors'

describe('getStudentsService (integration)', () => {
  it('returns only role=student profiles, ordered by fullName', async () => {
    await seedProfile({ role: 'admin', fullName: 'Admin Adams' })
    await seedProfile({ role: 'teacher', fullName: 'Tina Teacher' })
    await seedProfile({ role: 'student', fullName: 'Bob' })
    await seedProfile({ role: 'student', fullName: 'Alice' })

    const { students } = await getStudentsService()

    expect(students.map((s) => s.fullName)).toEqual(['Alice', 'Bob'])
  })

  it('builds assignment stats from real submissions', async () => {
    const studentId = await seedProfile({ role: 'student', fullName: 'Sara' })
    const courseId = await seedCourse({ title: 'Foundations' })
    const lessonId = await seedLesson({ courseId })
    const a1 = await seedAssignment({ lessonId })
    const a2 = await seedAssignment({ lessonId })
    // graded + submitted → counts toward submitted + average
    await seedSubmission({
      assignmentId: a1,
      studentId,
      status: 'submitted',
      grade: 80,
    })
    // draft → excluded from submittedAssignments and (null grade) from average
    await seedSubmission({ assignmentId: a2, studentId, status: 'draft' })

    const { students } = await getStudentsService()

    expect(students).toHaveLength(1)
    const stats = students[0].assignmentStats
    expect(stats.totalAssignments).toBe(2)
    expect(stats.submittedAssignments).toBe(1)
    expect(stats.averageGradeByCourse).toEqual([
      { courseId, courseTitle: 'Foundations', averageGrade: 80, maxGrade: 100 },
    ])
    // NOTE: current behavior — enrollmentCount is the total course count, not
    // the student's actual courses (placeholder; see plan "out of scope").
    expect(students[0].enrollmentCount).toBe(1)
  })

  it('returns an empty list when there are no students', async () => {
    await seedProfile({ role: 'admin' })

    const { students } = await getStudentsService()

    expect(students).toEqual([])
  })
})

describe('getStudentDetailService (integration)', () => {
  it('throws NotFoundError for an unknown id', async () => {
    await expect(
      getStudentDetailService({
        studentId: '00000000-0000-0000-0000-000000000000',
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws NotFoundError when the id belongs to a non-student profile', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await expect(
      getStudentDetailService({ studentId: adminId }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('returns identity fields and only assignments with a submitted submission', async () => {
    const studentId = await seedProfile({
      role: 'student',
      fullName: 'Sara Student',
      email: 'sara@test.dev',
    })
    const courseId = await seedCourse({ title: 'Foundations' })
    const lessonId = await seedLesson({ courseId })
    const submittedAssignment = await seedAssignment({
      lessonId,
      title: 'Essay',
    })
    const draftAssignment = await seedAssignment({ lessonId, title: 'Quiz' })
    await seedSubmission({
      assignmentId: submittedAssignment,
      studentId,
      status: 'submitted',
      grade: 90,
    })
    await seedSubmission({
      assignmentId: draftAssignment,
      studentId,
      status: 'draft',
    })

    const { student } = await getStudentDetailService({ studentId })

    expect(student).toMatchObject({
      id: studentId,
      fullName: 'Sara Student',
      email: 'sara@test.dev',
      bio: null,
      avatarUrl: null,
    })
    // only the submitted-submission assignment surfaces
    expect(student.assignments.map((a) => a.title)).toEqual(['Essay'])
    expect(student.assignments[0].submission?.grade).toBe(90)
    // NOTE: current behavior — enrollments mirror all courses with a hardcoded
    // 'active' status and courseId = course id (placeholder; see plan).
    expect(student.enrollments).toEqual([
      { id: courseId, status: 'active', courseId, courseTitle: 'Foundations' },
    ])
  })
})
