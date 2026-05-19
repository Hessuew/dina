import { createServerFn } from '@tanstack/react-start'
import {
  createAssignmentService,
  createOrUpdateSubmissionService,
  deleteAssignmentService,
  getAllAssignmentsForStudentService,
  getAllAssignmentsForTeacherService,
  getAssignmentService,
  getAssignmentSubmissionCountService,
  getAssignmentSubmissionsService,
  getAssignmentsByLessonService,
  getLessonService,
  getSubmissionService,
  gradeSubmissionService,
  updateAssignmentService,
} from '@/utils/assignments/service/assignments.service'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  createAssignmentSchema,
  createOrUpdateSubmissionSchema,
  deleteAssignmentSchema,
  getAssignmentSchema,
  getAssignmentSubmissionCountSchema,
  getAssignmentSubmissionsSchema,
  getAssignmentsByLessonSchema,
  getSubmissionSchema,
  gradeSubmissionSchema,
  updateAssignmentSchema,
} from '@/schemas/assignment.schema'
import { getLessonSchema } from '@/schemas/lesson.schema'

export const getLesson = createServerFn({ method: 'POST' })
  .inputValidator(getLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const result = await getLessonService(data, user.id)
    return { ...result, user }
  })

export const getAssignmentsByLesson = createServerFn({ method: 'POST' })
  .inputValidator(getAssignmentsByLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getAssignmentsByLessonService(data, user.id)
  })

export const getAssignment = createServerFn({ method: 'POST' })
  .inputValidator(getAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const result = await getAssignmentService(data, user.id)
    return { ...result, user }
  })

export const createAssignment = createServerFn({ method: 'POST' })
  .inputValidator(createAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createAssignmentService(data, user.id)
  })

export const updateAssignment = createServerFn({ method: 'POST' })
  .inputValidator(updateAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateAssignmentService(data, user.id)
  })

export const getAssignmentSubmissionCount = createServerFn({ method: 'POST' })
  .inputValidator(getAssignmentSubmissionCountSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getAssignmentSubmissionCountService(data, user.id)
  })

export const deleteAssignment = createServerFn({ method: 'POST' })
  .inputValidator(deleteAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteAssignmentService(data, user.id)
  })

export const getSubmission = createServerFn({ method: 'POST' })
  .inputValidator(getSubmissionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getSubmissionService(data, user.id)
  })

export const createOrUpdateSubmission = createServerFn({ method: 'POST' })
  .inputValidator(createOrUpdateSubmissionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createOrUpdateSubmissionService(data, user.id)
  })

export const getAllAssignmentsForStudent = createServerFn({
  method: 'POST',
}).handler(async () => {
  const user = await getCurrentUser()
  return getAllAssignmentsForStudentService(user.id)
})

export const getAllAssignmentsForTeacher = createServerFn({
  method: 'POST',
}).handler(async () => {
  const user = await getCurrentUser()
  return getAllAssignmentsForTeacherService(user.id)
})

export const getAssignmentSubmissions = createServerFn({ method: 'POST' })
  .inputValidator(getAssignmentSubmissionsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getAssignmentSubmissionsService(data, user.id)
  })

export const gradeSubmission = createServerFn({ method: 'POST' })
  .inputValidator(gradeSubmissionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return gradeSubmissionService(data, user.id)
  })
