import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import z from 'zod'
import { db } from '@/db'
import {
  assignments,
  courses,
  lessons,
  profiles,
  submissions,
} from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'

export const getLesson = createServerFn({ method: 'GET' })
  .inputValidator((d: { lessonId: string }) => d)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, data.lessonId),
      with: {
        course: {
          with: {
            teacher: true,
          },
        },
        assignments: {
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        },
      },
    })

    if (!lesson) {
      throw new Error('Lesson not found')
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    return {
      lesson,
      role: profile.role,
    }
  })

export const getAssignmentsByLesson = createServerFn({ method: 'GET' })
  .inputValidator((d: { lessonId: string }) => d)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, data.lessonId),
    })

    if (!lesson) {
      throw new Error('Lesson not found')
    }

    let assignmentsList = await db.query.assignments.findMany({
      where: eq(assignments.lessonId, data.lessonId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })

    if (profile.role === 'student') {
      assignmentsList = assignmentsList.filter((a) => a.status === 'published')
    }

    return {
      assignments: assignmentsList,
      role: profile.role,
    }
  })

export const getAssignment = createServerFn({ method: 'GET' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const assignment = await db.query.assignments.findFirst({
      where: eq(assignments.id, data.assignmentId),
      with: {
        lesson: {
          with: {
            course: {
              with: {
                teacher: true,
              },
            },
          },
        },
      },
    })

    if (!assignment) {
      throw new Error('Assignment not found')
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    if (profile.role === 'student' && assignment.status !== 'published') {
      throw new Error('Assignment not available')
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
      assignment,
      submission,
      role: profile.role,
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

    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, data.lessonId),
      with: {
        course: true,
      },
    })

    if (!lesson) {
      throw new Error('Lesson not found')
    }

    const { requireTeacherOfCourse } = await import('@/utils/auth')
    await requireTeacherOfCourse(user.id, lesson.courseId)

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

export const updateAssignment = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      assignmentId: string
      title: string
      description?: string
      dueDate: string
      maxGrade?: number
      status?: 'draft' | 'published' | 'closed'
    }) => d,
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

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
      throw new Error('Assignment not found')
    }

    const { requireTeacherOfCourse } = await import('@/utils/auth')
    await requireTeacherOfCourse(user.id, assignment.lesson.courseId)

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

export const getAssignmentSubmissionCount = createServerFn({ method: 'GET' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

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
      throw new Error('Assignment not found')
    }

    const { requireTeacherOfCourse } = await import('@/utils/auth')
    await requireTeacherOfCourse(user.id, assignment.lesson.courseId)

    return { count: assignment.submissions.length }
  })

export const deleteAssignment = createServerFn({ method: 'POST' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

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
      throw new Error('Assignment not found')
    }

    const { requireTeacherOfCourse } = await import('@/utils/auth')
    await requireTeacherOfCourse(user.id, assignment.lesson.courseId)

    if (assignment.submissions.length > 0) {
      throw new Error(
        `Cannot delete assignment with ${assignment.submissions.length} submission${assignment.submissions.length !== 1 ? 's' : ''}`,
      )
    }

    await db.delete(assignments).where(eq(assignments.id, data.assignmentId))

    return { success: true }
  })

export const getSubmission = createServerFn({ method: 'GET' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

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

    const assignment = await db.query.assignments.findFirst({
      where: eq(assignments.id, data.assignmentId),
    })

    if (!assignment) {
      throw new Error('Assignment not found')
    }

    if (assignment.status !== 'published') {
      throw new Error('Assignment is not open for submissions')
    }

    const now = new Date()
    if (assignment.dueDate < now) {
      throw new Error('Assignment due date has passed')
    }

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
  method: 'GET',
}).handler(async () => {
  const user = await getCurrentUser()

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })

  if (!profile || profile.role !== 'student') {
    throw new Error('Only students can access this endpoint')
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
  method: 'GET',
}).handler(async () => {
  const user = await getCurrentUser()

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  })

  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    throw new Error('Only teachers and admins can access this endpoint')
  }

  const teacherCourses = await db.query.courses.findMany({
    where: eq(courses.teacherId, user.id),
    columns: { id: true },
  })

  const courseIds = teacherCourses.map((c) => c.id)

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
    const totalSubmissions = assignment.submissions.length
    const submittedCount = assignment.submissions.filter(
      (s) => s.status === 'submitted',
    ).length
    const gradedCount = assignment.submissions.filter(
      (s) => s.grade !== null,
    ).length

    return {
      ...assignment,
      lesson: {
        ...assignment.lesson,
        course: {
          ...assignment.lesson.course,
          startDate: assignment.lesson.scheduledTime || null,
        },
      },
      submissionStats: {
        total: totalSubmissions,
        submitted: submittedCount,
        graded: gradedCount,
      },
    }
  })

  return { assignments: assignmentsWithStats }
})

export const getAssignmentSubmissions = createServerFn({ method: 'GET' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

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
      throw new Error('Assignment not found')
    }

    const { requireTeacherOfCourse } = await import('@/utils/auth')
    await requireTeacherOfCourse(user.id, assignment.lesson.courseId)

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
      throw new Error('Assignment not found')
    }

    const { requireTeacherOfCourse } = await import('@/utils/auth')
    await requireTeacherOfCourse(user.id, assignment.lesson.courseId)

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
