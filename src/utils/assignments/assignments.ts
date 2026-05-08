import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import z from 'zod'
import { getDb } from '@/db'
import {
  deleteAssignmentSchema,
  getAssignmentSchema,
  getAssignmentSubmissionCountSchema,
  getAssignmentSubmissionsSchema,
  getAssignmentsByLessonSchema,
  getSubmissionSchema,
  updateAssignmentSchema,
} from '@/schemas/assignment.schema'
import { getLessonSchema } from '@/schemas/lesson.schema'
import {
  assignments,
  courseTeachers,
  lessons,
  profiles,
  submissions,
} from '@/db/schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
import {
  calculateAssignmentStats,
  canDeleteAssignment,
  filterAssignmentsForStudent,
  validateSubmissionWindow,
} from '@/domain/assignment.service'

export const getLesson = createServerFn({ method: 'POST' })
  .inputValidator(getLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, data.lessonId),
      with: {
        course: {
          with: {
            courseTeachers: {
              with: {
                teacher: {
                  columns: {
                    avatarUrl: true,
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        assignments: {
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        },
      },
    })

    if (!lesson) {
      throw new NotFoundError('Lesson not found', {
        code: 'LESSON_NOT_FOUND',
        details: { lessonId: data.lessonId },
      })
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    return {
      lesson: {
        ...lesson,
        course: {
          id: lesson.course.id,
          teacher1Id: lesson.course.courseTeachers[0]?.teacherId ?? null,
          teacher2Id: lesson.course.courseTeachers[1]?.teacherId ?? null,
        },
      },
      role: profile.role,
      user,
    }
  })

export const getAssignmentsByLesson = createServerFn({ method: 'POST' })
  .inputValidator(getAssignmentsByLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, data.lessonId),
    })

    if (!lesson) {
      throw new NotFoundError('Lesson not found', {
        code: 'LESSON_NOT_FOUND',
        details: { lessonId: data.lessonId },
      })
    }

    let assignmentsList = await db.query.assignments.findMany({
      where: eq(assignments.lessonId, data.lessonId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })

    if (profile.role === 'student') {
      assignmentsList = filterAssignmentsForStudent(assignmentsList)
    }

    return {
      assignments: assignmentsList,
      role: profile.role,
    }
  })

export const getAssignment = createServerFn({ method: 'POST' })
  .inputValidator(getAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const assignment = await db.query.assignments.findFirst({
      where: eq(assignments.id, data.assignmentId),
      with: {
        lesson: {
          with: {
            course: {
              with: {
                courseTeachers: {
                  with: {
                    teacher: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!assignment) {
      throw new NotFoundError('Assignment not found', {
        code: 'ASSIGNMENT_NOT_FOUND',
        details: { assignmentId: data.assignmentId },
      })
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    if (profile.role === 'student' && assignment.status !== 'published') {
      throw new AuthorizationError('Assignment not available', {
        internalMessage: `Student attempted to access unpublished assignment: ${data.assignmentId}`,
        details: { assignmentId: data.assignmentId, status: assignment.status },
      })
    }

    let submission = null
    if (profile.role === 'student') {
      submission = await db.query.submissions.findFirst({
        where: and(
          eq(submissions.assignmentId, data.assignmentId),
          eq(submissions.studentId, user.id),
        ),
      })
    }

    return {
      assignment: {
        ...assignment,
        lesson: {
          ...assignment.lesson,
          course: {
            id: assignment.lesson.course.id,
            title: assignment.lesson.course.title,
            teacher1Id:
              assignment.lesson.course.courseTeachers[0]?.teacherId ?? null,
            teacher2Id:
              assignment.lesson.course.courseTeachers[1]?.teacherId ?? null,
          },
        },
      },
      submission,
      role: profile.role,
      user,
    }
  })

export const createAssignment = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      lessonId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.string(),
      maxGrade: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      const lesson = await db.query.lessons.findFirst({
        where: eq(lessons.id, data.lessonId),
        with: {
          course: true,
        },
      })

      if (!lesson) {
        throw new NotFoundError('Lesson not found', {
          code: 'LESSON_NOT_FOUND',
          details: { lessonId: data.lessonId },
        })
      }

      await authz(user.id).perform('createLesson').on('course', lesson.courseId)

      const [assignment] = await db
        .insert(assignments)
        .values({
          lessonId: data.lessonId,
          title: data.title,
          description: data.description || null,
          dueDate: new Date(data.dueDate),
          maxGrade: data.maxGrade || 100,
          status: 'draft',
        })
        .returning()

      return { assignment }
    })
  })

export const updateAssignment = createServerFn({ method: 'POST' })
  .inputValidator(updateAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      const assignment = await db.query.assignments.findFirst({
        where: eq(assignments.id, data.assignmentId),
        with: {
          lesson: {
            with: {
              course: true,
            },
          },
        },
      })

      if (!assignment) {
        throw new NotFoundError('Assignment not found', {
          code: 'ASSIGNMENT_NOT_FOUND',
          details: { assignmentId: data.assignmentId },
        })
      }

      await authz(user.id)
        .perform('editLesson')
        .on('course', assignment.lesson.courseId)

      const [updatedAssignment] = await db
        .update(assignments)
        .set({
          title: data.title,
          description: data.description || null,
          dueDate: new Date(data.dueDate),
          maxGrade: data.maxGrade || 100,
          status: data.status,
          updatedAt: new Date(),
        })
        .where(eq(assignments.id, data.assignmentId))
        .returning()

      return { assignment: updatedAssignment }
    })
  })

export const getAssignmentSubmissionCount = createServerFn({ method: 'POST' })
  .inputValidator(getAssignmentSubmissionCountSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      const assignment = await db.query.assignments.findFirst({
        where: eq(assignments.id, data.assignmentId),
        with: {
          lesson: {
            with: {
              course: true,
            },
          },
          submissions: true,
        },
      })

      if (!assignment) {
        throw new NotFoundError('Assignment not found', {
          code: 'ASSIGNMENT_NOT_FOUND',
          details: { assignmentId: data.assignmentId },
        })
      }

      await authz(user.id)
        .perform('editLesson')
        .on('course', assignment.lesson.courseId)

      return { count: assignment.submissions.length }
    })
  })

export const deleteAssignment = createServerFn({ method: 'POST' })
  .inputValidator(deleteAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      const assignment = await db.query.assignments.findFirst({
        where: eq(assignments.id, data.assignmentId),
        with: {
          lesson: {
            with: {
              course: true,
            },
          },
          submissions: true,
        },
      })

      if (!assignment) {
        throw new NotFoundError('Assignment not found', {
          code: 'ASSIGNMENT_NOT_FOUND',
          details: { assignmentId: data.assignmentId },
        })
      }

      await authz(user.id)
        .perform('editLesson')
        .on('course', assignment.lesson.courseId)

      if (!canDeleteAssignment(assignment, assignment.submissions)) {
        throw new ValidationError(
          `Cannot delete assignment with ${assignment.submissions.length} submission${assignment.submissions.length !== 1 ? 's' : ''}`,
          {
            details: {
              assignmentId: data.assignmentId,
              submissionCount: assignment.submissions.length,
            },
          },
        )
      }

      await db.delete(assignments).where(eq(assignments.id, data.assignmentId))
    })
  })

export const getSubmission = createServerFn({ method: 'POST' })
  .inputValidator(getSubmissionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const submission = await db.query.submissions.findFirst({
      where: and(
        eq(submissions.assignmentId, data.assignmentId),
        eq(submissions.studentId, user.id),
      ),
    })

    return { submission }
  })

export const createOrUpdateSubmission = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      assignmentId: z.string(),
      content: z.string().optional(),
      fileUrl: z.string().optional(),
      submit: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const assignment = await db.query.assignments.findFirst({
      where: eq(assignments.id, data.assignmentId),
    })

    if (!assignment) {
      throw new NotFoundError('Assignment not found', {
        code: 'ASSIGNMENT_NOT_FOUND',
        details: { assignmentId: data.assignmentId },
      })
    }

    validateSubmissionWindow(assignment, new Date())

    const existingSubmission = await db.query.submissions.findFirst({
      where: and(
        eq(submissions.assignmentId, data.assignmentId),
        eq(submissions.studentId, user.id),
      ),
    })

    let submission

    if (existingSubmission) {
      const [updated] = await db
        .update(submissions)
        .set({
          content: data.content || null,
          fileUrl: data.fileUrl || null,
          status: data.submit ? 'submitted' : 'draft',
          submittedAt: data.submit
            ? new Date()
            : existingSubmission.submittedAt,
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, existingSubmission.id))
        .returning()

      submission = updated
    } else {
      const [created] = await db
        .insert(submissions)
        .values({
          assignmentId: data.assignmentId,
          studentId: user.id,
          content: data.content || null,
          fileUrl: data.fileUrl || null,
          status: data.submit ? 'submitted' : 'draft',
          submittedAt: data.submit ? new Date() : null,
        })
        .returning()

      submission = created
    }

    return { submission }
  })

export const getAllAssignmentsForStudent = createServerFn({
  method: 'POST',
}).handler(async () => {
  const user = await getCurrentUser()
  const db = await getDb()

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })

  if (!profile || profile.role !== 'student') {
    throw new AuthorizationError('Only students can access this endpoint', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-student attempted to access student endpoint',
      details: { role: profile?.role },
    })
  }

  const allAssignments = await db.query.assignments.findMany({
    where: eq(assignments.status, 'published'),
    with: {
      lesson: {
        columns: {
          id: true,
          scheduledTime: true,
          title: true,
        },
        with: {
          course: true,
        },
      },
      submissions: {
        where: eq(submissions.studentId, user.id),
      },
    },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  })

  const assignmentsWithSubmission = allAssignments.map((assignment) => ({
    ...assignment,
    lesson: {
      ...assignment.lesson,
      course: {
        ...assignment.lesson.course,
        startDate: assignment.lesson.scheduledTime || null,
      },
    },
    submission: assignment.submissions[0] || null,
    submissions: undefined,
  }))

  return { assignments: assignmentsWithSubmission }
})

export const getAllAssignmentsForTeacher = createServerFn({
  method: 'POST',
}).handler(async () => {
  const user = await getCurrentUser()
  const db = await getDb()

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    throw new AuthorizationError(
      'Only teachers and admins can access this endpoint',
      {
        code: 'ROLE_REQUIRED',
        internalMessage:
          'Non-teacher/non-admin attempted to access teacher endpoint',
        details: { role: profile?.role },
      },
    )
  }

  const teacherAssignments = await db.query.courseTeachers.findMany({
    where: eq(courseTeachers.teacherId, user.id),
    columns: { courseId: true },
  })

  const courseIds = teacherAssignments.map((ta) => ta.courseId)

  if (courseIds.length === 0) {
    return { assignments: [] }
  }

  const { inArray } = await import('drizzle-orm')

  const allLessons = await db.query.lessons.findMany({
    where: inArray(lessons.courseId, courseIds),
    columns: { id: true },
  })

  const lessonIds = allLessons.map((l) => l.id)

  if (lessonIds.length === 0) {
    return { assignments: [] }
  }

  const allAssignments = await db.query.assignments.findMany({
    where: inArray(assignments.lessonId, lessonIds),
    with: {
      lesson: {
        columns: {
          id: true,
          scheduledTime: true,
          title: true,
        },
        with: {
          course: true,
        },
      },
      submissions: true,
    },
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  })

  const assignmentsWithStats = allAssignments.map((assignment) => {
    const stats = calculateAssignmentStats(assignment.submissions)

    return {
      ...assignment,
      lesson: {
        ...assignment.lesson,
        course: {
          ...assignment.lesson.course,
          startDate: assignment.lesson.scheduledTime || null,
        },
      },
      submissionStats: stats,
    }
  })

  return { assignments: assignmentsWithStats }
})

export const getAssignmentSubmissions = createServerFn({ method: 'POST' })
  .inputValidator(getAssignmentSubmissionsSchema)
  .handler(async ({ data }) => {
    const db = await getDb()

    const assignment = await db.query.assignments.findFirst({
      where: eq(assignments.id, data.assignmentId),
      with: {
        lesson: {
          with: {
            course: true,
          },
        },
      },
    })

    if (!assignment) {
      throw new NotFoundError('Assignment not found', {
        code: 'ASSIGNMENT_NOT_FOUND',
        details: { assignmentId: data.assignmentId },
      })
    }

    const allSubmissions = await db.query.submissions.findMany({
      where: eq(submissions.assignmentId, data.assignmentId),
      with: {
        student: true,
      },
      orderBy: (t, { desc }) => [desc(t.submittedAt)],
    })

    return { submissions: allSubmissions }
  })

export const gradeSubmission = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      submissionId: z.string(),
      assignmentId: z.string(),
      grade: z.number(),
      feedback: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      const assignment = await db.query.assignments.findFirst({
        where: eq(assignments.id, data.assignmentId),
        with: {
          lesson: {
            with: {
              course: true,
            },
          },
        },
      })

      if (!assignment) {
        throw new NotFoundError('Assignment not found', {
          code: 'ASSIGNMENT_NOT_FOUND',
          details: { assignmentId: data.assignmentId },
        })
      }

      await authz(user.id)
        .perform('gradeAssignment')
        .on('course', assignment.lesson.courseId)

      const [gradedSubmission] = await db
        .update(submissions)
        .set({
          grade: data.grade,
          feedback: data.feedback || null,
          gradedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, data.submissionId))
        .returning()

      return { submission: gradedSubmission }
    })
  })
