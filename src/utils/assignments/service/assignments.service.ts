import type { GetLessonInput } from '@/schemas/lesson.schema'
import type {
  CreateAssignmentInput,
  CreateOrUpdateSubmissionInput,
  DeleteAssignmentInput,
  GetAssignmentInput,
  GetAssignmentSubmissionCountInput,
  GetAssignmentSubmissionsInput,
  GradeSubmissionInput,
  UpdateAssignmentInput,
} from '@/schemas/assignment.schema'
import {
  calculateAssignmentStats,
  canDeleteAssignment,
  validateSubmissionWindow,
} from '@/domain/assignment.service'
import { canOpenUnpublishedAssignment } from '@/utils/assignments/domain/assignment-detail.domain'
import {
  deleteAssignmentById,
  findAssignmentById,
  findAssignmentSubmissionsWithStudent,
  findAssignmentWithFullDetail,
  findAssignmentWithLesson,
  findAssignmentWithLessonAndSubmissions,
  findAssignmentsForTeacherCatalog,
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
  updateSubmission,
  updateSubmissionGrade,
  upsertSubmission,
} from '@/utils/assignments/repository/submissions.repository'
import { getUserProfile } from '@/utils/auth/auth'
import { authz } from '@/utils/authz'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import {
  AppError,
  AuthorizationError,
  NotFoundError,
  UNEXPECTED_ERROR_MESSAGE,
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
    teacherIds: lesson.course.courseTeachers.map(
      (teacher) => teacher.teacherId,
    ),
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

  const courseWithTeachers = {
    id: assignment.lesson.course.id,
    title: assignment.lesson.course.title,
    teacherIds: assignment.lesson.course.courseTeachers.map(
      (teacher) => teacher.teacherId,
    ),
    teacher1Id: assignment.lesson.course.courseTeachers[0]?.teacherId ?? null,
    teacher2Id: assignment.lesson.course.courseTeachers[1]?.teacherId ?? null,
  }

  const permissions = calculateEntityPermissions(
    profile.role,
    courseWithTeachers,
    userId,
  )

  if (
    assignment.status !== 'published' &&
    !canOpenUnpublishedAssignment({
      role: profile.role,
      canManage: permissions.canManage,
    })
  ) {
    throw new AuthorizationError('Assignment not available', {
      internalMessage: `Non-manager attempted to access unpublished assignment: ${data.assignmentId}`,
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

export type TeacherAssignmentListScope = 'owned' | 'catalog'

type TeacherListAssignment =
  | Awaited<ReturnType<typeof findAssignmentsForTeacherLessons>>[number]
  | Awaited<ReturnType<typeof findAssignmentsForTeacherCatalog>>[number]

function mapTeacherAssignmentRow(
  assignment: TeacherListAssignment,
  canManage: boolean,
) {
  const course = assignment.lesson.course
  const submissions =
    'submissions' in assignment && Array.isArray(assignment.submissions)
      ? assignment.submissions
      : null
  return {
    ...assignment,
    lesson: {
      ...assignment.lesson,
      course: {
        id: course.id,
        title: course.title,
        startDate: assignment.lesson.scheduledTime || null,
      },
    },
    // Catalog rows omit submissions; only owned lists include stats.
    submissionStats:
      canManage && submissions
        ? calculateAssignmentStats(submissions)
        : undefined,
    submissions: undefined,
  }
}

function courseTeachersFromRow(assignment: TeacherListAssignment): {
  teacherIds: Array<string>
} {
  const teachers = assignment.lesson.course.courseTeachers
  return {
    teacherIds: teachers
      .map((teacher) => teacher.teacherId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  }
}

export async function createAssignmentService(
  data: CreateAssignmentInput,
  userId: string,
) {
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
}

export async function updateAssignmentService(
  data: UpdateAssignmentInput,
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

  const updated = await updateAssignmentById(data.assignmentId, {
    title: data.title,
    description: data.description || null,
    dueDate: new Date(data.dueDate),
    maxGrade: data.maxGrade || 100,
    status: data.status,
    updatedAt: new Date(),
  })

  return { assignment: updated }
}

export async function getAssignmentSubmissionCountService(
  data: GetAssignmentSubmissionCountInput,
  userId: string,
) {
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
}

export async function deleteAssignmentService(
  data: DeleteAssignmentInput,
  userId: string,
) {
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
}

async function persistSubmission(
  data: CreateOrUpdateSubmissionInput,
  userId: string,
  existingSubmission: Awaited<
    ReturnType<typeof findSubmissionByAssignmentAndStudent>
  >,
) {
  if (existingSubmission) {
    return updateSubmission(existingSubmission.id, {
      content: data.content || null,
      status: data.submit ? 'submitted' : 'draft',
      submittedAt: data.submit ? new Date() : existingSubmission.submittedAt,
      updatedAt: new Date(),
    })
  }
  return upsertSubmission({
    assignmentId: data.assignmentId,
    studentId: userId,
    content: data.content || null,
    status: data.submit ? 'submitted' : 'draft',
    submittedAt: data.submit ? new Date() : null,
  })
}

function mapSubmissionPersistenceError(
  error: unknown,
  assignmentId: string,
  userId: string,
): AppError {
  console.error('Submission persistence failed', {
    assignmentId,
    userId,
    error,
    cause: error instanceof Error ? error.cause : undefined,
  })
  return new AppError({
    code: 'SUBMISSION_SAVE_FAILED',
    status: 500,
    userMessage: UNEXPECTED_ERROR_MESSAGE,
    internalMessage: `Failed to save submission for assignment ${assignmentId}`,
    details: { assignmentId, userId },
    cause: error,
  })
}

async function saveSubmission(
  data: CreateOrUpdateSubmissionInput,
  userId: string,
  existingSubmission: Awaited<
    ReturnType<typeof findSubmissionByAssignmentAndStudent>
  >,
) {
  try {
    return await persistSubmission(data, userId, existingSubmission)
  } catch (error) {
    throw mapSubmissionPersistenceError(error, data.assignmentId, userId)
  }
}

export async function createOrUpdateSubmissionService(
  data: CreateOrUpdateSubmissionInput,
  userId: string,
) {
  const profile = await getUserProfile(userId)
  if (profile.role !== 'student') {
    throw new AuthorizationError('Only students can submit assignments', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-student attempted to submit an assignment',
      details: { assignmentId: data.assignmentId, role: profile.role },
    })
  }

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
  const submission = await saveSubmission(data, userId, existingSubmission)
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

export async function getAllAssignmentsForTeacherService(
  userId: string,
  scope: TeacherAssignmentListScope = 'owned',
) {
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

  if (scope === 'catalog') {
    return getTeacherCatalogAssignments(userId, profile.role)
  }

  return getTeacherOwnedAssignments(userId, profile.role)
}

async function getTeacherOwnedAssignments(
  userId: string,
  role: 'teacher' | 'admin' | 'student',
) {
  const courseIds = await findCourseIdsByTeacher(userId)
  if (courseIds.length === 0) return { assignments: [] }

  const lessonIds = await findLessonIdsByCourseIds(courseIds)
  if (lessonIds.length === 0) return { assignments: [] }

  const allAssignments = await findAssignmentsForTeacherLessons(lessonIds)

  return {
    assignments: allAssignments.map((assignment) => {
      const teachers = courseTeachersFromRow(assignment)
      const permissions = calculateEntityPermissions(role, teachers, userId)
      return mapTeacherAssignmentRow(assignment, permissions.canManage)
    }),
  }
}

async function getTeacherCatalogAssignments(
  userId: string,
  role: 'teacher' | 'admin' | 'student',
) {
  const managedCourseIds = await findCourseIdsByTeacher(userId)
  const managedLessonIds =
    managedCourseIds.length > 0
      ? await findLessonIdsByCourseIds(managedCourseIds)
      : []
  // SQL already scopes: published campus-wide + drafts/closed on managed lessons.
  // No submission rows loaded for catalog.
  const allAssignments =
    await findAssignmentsForTeacherCatalog(managedLessonIds)

  return {
    assignments: allAssignments.map((assignment) => {
      const teachers = courseTeachersFromRow(assignment)
      const permissions = calculateEntityPermissions(role, teachers, userId)
      return mapTeacherAssignmentRow(assignment, permissions.canManage)
    }),
  }
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
    throw new ValidationError('Submission does not belong to this assignment', {
      details: {
        submissionId: data.submissionId,
        assignmentId: data.assignmentId,
      },
    })
  }

  const gradedSubmission = await updateSubmissionGrade(data.submissionId, {
    grade: data.grade,
    feedback: data.feedback || null,
    gradedAt: new Date(),
    updatedAt: new Date(),
  })

  return { submission: gradedSubmission }
}
