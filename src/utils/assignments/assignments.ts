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
  getLessonService,
  gradeSubmissionService,
  updateAssignmentService,
} from '@/utils/assignments/service/assignments.service'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  createAssignmentSchema,
  createOrUpdateSubmissionSchema,
  deleteAssignmentSchema,
  getAllAssignmentsForTeacherSchema,
  getAssignmentSchema,
  getAssignmentSubmissionCountSchema,
  getAssignmentSubmissionsSchema,
  gradeSubmissionSchema,
  updateAssignmentSchema,
} from '@/schemas/assignment.schema'
import { getLessonSchema } from '@/schemas/lesson.schema'

export const getLesson = createServerFn({ method: 'POST' })
  .validator(getLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const result = await getLessonService(data, user.id)
    return { ...result, user }
  })

export const getAssignment = createServerFn({ method: 'POST' })
  .validator(getAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const result = await getAssignmentService(data, user.id)
    return { ...result, user }
  })

export const createAssignment = createServerFn({ method: 'POST' })
  .validator(createAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createAssignmentService(data, user.id)
  })

export const updateAssignment = createServerFn({ method: 'POST' })
  .validator(updateAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateAssignmentService(data, user.id)
  })

export const getAssignmentSubmissionCount = createServerFn({ method: 'POST' })
  .validator(getAssignmentSubmissionCountSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getAssignmentSubmissionCountService(data, user.id)
  })

export const deleteAssignment = createServerFn({ method: 'POST' })
  .validator(deleteAssignmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteAssignmentService(data, user.id)
  })

export const createOrUpdateSubmission = createServerFn({ method: 'POST' })
  .validator(createOrUpdateSubmissionSchema)
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
})
  .validator(getAllAssignmentsForTeacherSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getAllAssignmentsForTeacherService(user.id, data.scope)
  })

export const getAssignmentSubmissions = createServerFn({ method: 'POST' })
  .validator(getAssignmentSubmissionsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getAssignmentSubmissionsService(data, user.id)
  })

export const gradeSubmission = createServerFn({ method: 'POST' })
  .validator(gradeSubmissionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return gradeSubmissionService(data, user.id)
  })
