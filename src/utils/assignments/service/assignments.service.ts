import type { GetLessonInput } from '@/schemas/lesson.schema'
import type {
  CreateAssignmentInput,
  CreateOrUpdateSubmissionInput,
  DeleteAssignmentInput,
  GetAssignmentInput,
  GetAssignmentSubmissionCountInput,
  GetAssignmentSubmissionsInput,
  GetAssignmentsByLessonInput,
  GetSubmissionInput,
  GradeSubmissionInput,
  UpdateAssignmentInput,
} from '@/schemas/assignment.schema'
import {
  calculateAssignmentStats,
  canDeleteAssignment,
  filterAssignmentsForStudent,
  validateSubmissionWindow,
} from '@/domain/assignment.service'
import {
  deleteAssignmentById,
  findAssignmentById,
  findAssignmentSubmissionsWithStudent,
  findAssignmentWithFullDetail,
  findAssignmentWithLesson,
  findAssignmentWithLessonAndSubmissions,
  findAssignmentsByLessonId,
  findAssignmentsForTeacherLessons,
  findCourseIdsByTeacher,
  findPublishedAssignmentsForStudent,
  insertAssignment,
  updateAssignmentById,
} from '@/utils/assignments/repository/assignments.repository'
import {
  findLessonById,
  findLessonIdsByCourseIds,
  findLessonWithDetail,
} from '@/utils/assignments/repository/lessons.repository'
import {
  findSubmissionByAssignmentAndStudent,
  findSubmissionById,
  insertSubmission,
  updateSubmission,
  updateSubmissionGrade,
} from '@/utils/assignments/repository/submissions.repository'
import { getUserProfile } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'

export async function getLessonService(data: GetLessonInput, userId: string) {
  const lesson = await findLessonWithDetail(data.lessonId)

  if (!lesson) {
    throw new NotFoundError('Lesson not found', {
      code: 'LESSON_NOT_FOUND',
      details: { lessonId: data.lessonId },
    })
  }

  const profile = await getUserProfile(userId)

  const courseWithTeachers = {
    id: lesson.course.id,
    teacher1Id: lesson.course.courseTeachers[0]?.teacherId ?? null,
    teacher2Id: lesson.course.courseTeachers[1]?.teacherId ?? null,
  }

  const permissions = calculateEntityPermissions(
    profile.role,
    courseWithTeachers,
    userId,
  )

  return {
    lesson: { ...lesson, course: courseWithTeachers },
    role: profile.role,
    permissions,
  }
}

export async function getAssignmentsByLessonService(
  data: GetAssignmentsByLessonInput,
  userId: string,
) {
  const profile = await getUserProfile(userId)

  const lesson = await findLessonById(data.lessonId)
  if (!lesson) {
    throw new NotFoundError('Lesson not found', {
      code: 'LESSON_NOT_FOUND',
      details: { lessonId: data.lessonId },
    })
  }

  let assignmentsList = await findAssignmentsByLessonId(data.lessonId)
  if (profile.role === 'student') {
    assignmentsList = filterAssignmentsForStudent(assignmentsList)
  }

  return { assignments: assignmentsList, role: profile.role }
}

export async function getAssignmentService(
  data: GetAssignmentInput,
  userId: string,
) {
  const assignment = await findAssignmentWithFullDetail(data.assignmentId)

  if (!assignment) {
    throw new NotFoundError('Assignment not found', {
      code: 'ASSIGNMENT_NOT_FOUND',
      details: { assignmentId: data.assignmentId },
    })
  }

  const profile = await getUserProfile(userId)

  if (profile.role === 'student' && assignment.status !== 'published') {
    throw new AuthorizationError('Assignment not available', {
      internalMessage: `Student attempted to access unpublished assignment: ${data.assignmentId}`,
      details: { assignmentId: data.assignmentId, status: assignment.status },
    })
  }

  let submission = null
  if (profile.role === 'student') {
    submission = await findSubmissionByAssignmentAndStudent(
      data.assignmentId,
      userId,
    )
  }

  const courseWithTeachers = {
    id: assignment.lesson.course.id,
    title: assignment.lesson.course.title,
    teacher1Id: assignment.lesson.course.courseTeachers[0]?.teacherId ?? null,
    teacher2Id: assignment.lesson.course.courseTeachers[1]?.teacherId ?? null,
  }

  const permissions = calculateEntityPermissions(
    profile.role,
    courseWithTeachers,
    userId,
  )

  return {
    assignment: {
      ...assignment,
      lesson: { ...assignment.lesson, course: courseWithTeachers },
    },
    submission,
    role: profile.role,
    permissions,
  }
}

export async function createAssignmentService(
  data: CreateAssignmentInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const lesson = await findLessonById(data.lessonId)
    if (!lesson) {
      throw new NotFoundError('Lesson not found', {
        code: 'LESSON_NOT_FOUND',
        details: { lessonId: data.lessonId },
      })
    }

    await authz(userId).perform('createLesson').on('course', lesson.courseId)

    const assignment = await insertAssignment({
      lessonId: data.lessonId,
      title: data.title,
      description: data.description || null,
      dueDate: new Date(data.dueDate),
      maxGrade: data.maxGrade || 100,
      status: 'draft',
    })

    return { assignment }
  })
}

export async function updateAssignmentService(
  data: UpdateAssignmentInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const assignment = await findAssignmentWithLesson(data.assignmentId)
    if (!assignment) {
      throw new NotFoundError('Assignment not found', {
        code: 'ASSIGNMENT_NOT_FOUND',
        details: { assignmentId: data.assignmentId },
      })
    }

    await authz(userId)
      .perform('editLesson')
      .on('course', assignment.lesson.courseId)

    const updated = await updateAssignmentById(data.assignmentId, {
      title: data.title,
      description: data.description || null,
      dueDate: new Date(data.dueDate),
      maxGrade: data.maxGrade || 100,
      status: data.status,
      updatedAt: new Date(),
    })

    return { assignment: updated }
  })
}

export async function getAssignmentSubmissionCountService(
  data: GetAssignmentSubmissionCountInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const assignment = await findAssignmentWithLessonAndSubmissions(
      data.assignmentId,
    )
    if (!assignment) {
      throw new NotFoundError('Assignment not found', {
        code: 'ASSIGNMENT_NOT_FOUND',
        details: { assignmentId: data.assignmentId },
      })
    }

    await authz(userId)
      .perform('editLesson')
      .on('course', assignment.lesson.courseId)

    return { count: assignment.submissions.length }
  })
}

export async function deleteAssignmentService(
  data: DeleteAssignmentInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const assignment = await findAssignmentWithLessonAndSubmissions(
      data.assignmentId,
    )
    if (!assignment) {
      throw new NotFoundError('Assignment not found', {
        code: 'ASSIGNMENT_NOT_FOUND',
        details: { assignmentId: data.assignmentId },
      })
    }

    await authz(userId)
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

    await deleteAssignmentById(data.assignmentId)
  })
}

export async function getSubmissionService(
  data: GetSubmissionInput,
  userId: string,
) {
  const submission = await findSubmissionByAssignmentAndStudent(
    data.assignmentId,
    userId,
  )
  return { submission }
}

export async function createOrUpdateSubmissionService(
  data: CreateOrUpdateSubmissionInput,
  userId: string,
) {
  const assignment = await findAssignmentById(data.assignmentId)
  if (!assignment) {
    throw new NotFoundError('Assignment not found', {
      code: 'ASSIGNMENT_NOT_FOUND',
      details: { assignmentId: data.assignmentId },
    })
  }

  validateSubmissionWindow(assignment, new Date())

  const existingSubmission = await findSubmissionByAssignmentAndStudent(
    data.assignmentId,
    userId,
  )

  let submission
  if (existingSubmission) {
    submission = await updateSubmission(existingSubmission.id, {
      content: data.content || null,
      fileUrl: data.fileUrl || null,
      status: data.submit ? 'submitted' : 'draft',
      submittedAt: data.submit ? new Date() : existingSubmission.submittedAt,
      updatedAt: new Date(),
    })
  } else {
    submission = await insertSubmission({
      assignmentId: data.assignmentId,
      studentId: userId,
      content: data.content || null,
      fileUrl: data.fileUrl || null,
      status: data.submit ? 'submitted' : 'draft',
      submittedAt: data.submit ? new Date() : null,
    })
  }

  return { submission }
}

export async function getAllAssignmentsForStudentService(userId: string) {
  const profile = await getUserProfile(userId)

  if (profile.role !== 'student') {
    throw new AuthorizationError('Only students can access this endpoint', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-student attempted to access student endpoint',
      details: { role: profile.role },
    })
  }

  const allAssignments = await findPublishedAssignmentsForStudent(userId)

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
}

export async function getAllAssignmentsForTeacherService(userId: string) {
  const profile = await getUserProfile(userId)

  if (profile.role !== 'teacher' && profile.role !== 'admin') {
    throw new AuthorizationError(
      'Only teachers and admins can access this endpoint',
      {
        code: 'ROLE_REQUIRED',
        internalMessage:
          'Non-teacher/non-admin attempted to access teacher endpoint',
        details: { role: profile.role },
      },
    )
  }

  const courseIds = await findCourseIdsByTeacher(userId)
  if (courseIds.length === 0) return { assignments: [] }

  const lessonIds = await findLessonIdsByCourseIds(courseIds)
  if (lessonIds.length === 0) return { assignments: [] }

  const allAssignments = await findAssignmentsForTeacherLessons(lessonIds)

  const assignmentsWithStats = allAssignments.map((assignment) => ({
    ...assignment,
    lesson: {
      ...assignment.lesson,
      course: {
        ...assignment.lesson.course,
        startDate: assignment.lesson.scheduledTime || null,
      },
    },
    submissionStats: calculateAssignmentStats(assignment.submissions),
  }))

  return { assignments: assignmentsWithStats }
}

export async function getAssignmentSubmissionsService(
  data: GetAssignmentSubmissionsInput,
  userId: string,
) {
  const assignment = await findAssignmentWithLesson(data.assignmentId)
  if (!assignment) {
    throw new NotFoundError('Assignment not found', {
      code: 'ASSIGNMENT_NOT_FOUND',
      details: { assignmentId: data.assignmentId },
    })
  }

  await authz(userId)
    .perform('editLesson')
    .on('course', assignment.lesson.courseId)

  const allSubmissions = await findAssignmentSubmissionsWithStudent(
    data.assignmentId,
  )
  return { submissions: allSubmissions }
}

export async function gradeSubmissionService(
  data: GradeSubmissionInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const assignment = await findAssignmentWithLesson(data.assignmentId)
    if (!assignment) {
      throw new NotFoundError('Assignment not found', {
        code: 'ASSIGNMENT_NOT_FOUND',
        details: { assignmentId: data.assignmentId },
      })
    }

    await authz(userId)
      .perform('gradeAssignment')
      .on('course', assignment.lesson.courseId)

    const submission = await findSubmissionById(data.submissionId)
    if (!submission) {
      throw new NotFoundError('Submission not found', {
        code: 'NOT_FOUND',
        details: { submissionId: data.submissionId },
      })
    }
    if (submission.assignmentId !== data.assignmentId) {
      throw new ValidationError(
        'Submission does not belong to this assignment',
        {
          details: {
            submissionId: data.submissionId,
            assignmentId: data.assignmentId,
          },
        },
      )
    }

    const gradedSubmission = await updateSubmissionGrade(data.submissionId, {
      grade: data.grade,
      feedback: data.feedback || null,
      gradedAt: new Date(),
      updatedAt: new Date(),
    })

    return { submission: gradedSubmission }
  })
}
