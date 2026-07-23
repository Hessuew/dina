import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { getDb } from '@/db'
import { submissions as submissionsTable } from '@/db/schema'
import { upsertSubmission } from '@/utils/assignments/repository/submissions.repository'
import {
  createAssignmentService,
  createOrUpdateSubmissionService,
  deleteAssignmentService,
  getAllAssignmentsForStudentService,
  getAllAssignmentsForTeacherService,
  getAssignmentService,
  getAssignmentSubmissionCountService,
  getAssignmentSubmissionsService,
  gradeSubmissionService,
  updateAssignmentService,
} from '@/utils/assignments/service/assignments.service'
import { findAssignmentById } from '@/utils/assignments/repository/assignments.repository'
import {
  seedAssignment,
  seedCourse,
  seedCourseTeacher,
  seedLesson,
  seedProfile,
  seedSubmission,
} from '@/../test/integration/seed'

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

const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000)
const past = () => new Date(Date.now() - 24 * 60 * 60 * 1000)

describe('createAssignmentService (integration)', () => {
  it('course teacher creates a draft assignment defaulting maxGrade to 100', async () => {
    const { teacherId, lessonId } = await seedCourseWithTeacher()

    const { assignment } = await createAssignmentService(
      { lessonId, title: 'A1', dueDate: future().toISOString() },
      teacherId,
    )

    expect(assignment.status).toBe('draft')
    expect(assignment.maxGrade).toBe(100)
    expect(assignment.lessonId).toBe(lessonId)
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
  it('course teacher publishes a draft assignment', async () => {
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
  it('deletes an assignment that has no submissions', async () => {
    const { teacherId, lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({ lessonId })

    await deleteAssignmentService({ assignmentId }, teacherId)

    expect(await findAssignmentById(assignmentId)).toBeUndefined()
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

describe('getAssignmentService (integration)', () => {
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
  })

  it('throws when the assignment does not exist', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      getAssignmentService({ assignmentId: randomUUID() }, studentId),
    ).rejects.toMatchObject({ code: 'ASSIGNMENT_NOT_FOUND', status: 404 })
  })
})

describe('createOrUpdateSubmissionService (integration)', () => {
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

    const db = await getDb()
    const rows = await db
      .select()
      .from(submissionsTable)
      .where(
        and(
          eq(submissionsTable.assignmentId, assignmentId),
          eq(submissionsTable.studentId, studentId),
        ),
      )
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

  it('rejects a submission after the due date', async () => {
    const { lessonId } = await seedCourseWithTeacher()
    const assignmentId = await seedAssignment({
      lessonId,
      status: 'published',
      dueDate: past(),
    })
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      createOrUpdateSubmissionService(
        { assignmentId, submit: true },
        studentId,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 })
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

describe('getAllAssignmentsForStudentService (integration)', () => {
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

describe('getAssignmentSubmissionsService (integration)', () => {
  it('returns submissions with student detail for a course teacher', async () => {
    const { teacherId, assignmentId } =
      await seedPublishedAssignmentWithSubmission()

    const { submissions } = await getAssignmentSubmissionsService(
      { assignmentId },
      teacherId,
    )

    expect(submissions.length).toBe(1)
  })

  it('rejects a teacher not assigned to the course', async () => {
    const courseId = await seedCourse()
    const lessonId = await seedLesson({ courseId })
    const assignmentId = await seedAssignment({ lessonId })
    const outsiderId = await seedProfile({ role: 'teacher' })

    await expect(
      getAssignmentSubmissionsService({ assignmentId }, outsiderId),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
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
  it('grades a submission belonging to the assignment', async () => {
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
