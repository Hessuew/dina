import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  bulkGradeEnrollmentsSchema,
  createEnrollmentSchema,
  deleteEnrollmentSchema,
  distributeEnrollmentsSchema,
  endSubstitutionSchema,
  getEnrollmentByIdSchema,
  getEnrollmentEmailsSchema,
  getEnrollmentsSchema,
  searchEnrollmentContactsByNamesSchema,
  sendInvitationForEnrollmentSchema,
  setEnrollmentSpecialCaseSchema,
  setEvaluationAdmissionCategorySchema,
  setEvaluationNoteSchema,
  setEvaluationScoreSchema,
  substituteTeacherSchema,
  updateEnrollmentStatusSchema,
} from '@/schemas/enrollment.schema'
import {
  bulkGradeEnrollmentsService,
  createEnrollmentService,
  deleteEnrollmentService,
  distributeEnrollmentsService,
  endSubstitutionService,
  getActiveSubstitutedTeacherIdsService,
  getEnrollmentByIdService,
  getEnrollmentEmailsService,
  getEnrollmentsService,
  searchEnrollmentContactsByNamesService,
  sendInvitationForEnrollmentService,
  setEnrollmentSpecialCaseService,
  setEvaluationAdmissionCategoryService,
  setEvaluationNoteService,
  setEvaluationScoreService,
  substituteTeacherService,
  updateEnrollmentStatusService,
} from '@/utils/enrolment/service/enrolment.service'

const ENROLLMENT_OPEN = false as boolean

export const createEnrollment = createServerFn({ method: 'POST' })
  .validator(createEnrollmentSchema)
  .handler(({ data }) => {
    if (!ENROLLMENT_OPEN) throw new Error('Enrollment is currently closed.')
    return createEnrollmentService(data)
  })

export const getEnrollments = createServerFn({ method: 'POST' })
  .validator(getEnrollmentsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getEnrollmentsService(data, user.id)
  })

export const getEnrollmentById = createServerFn({ method: 'GET' })
  .validator(getEnrollmentByIdSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getEnrollmentByIdService(data, user.id)
  })

export const updateEnrollmentStatus = createServerFn({ method: 'POST' })
  .validator(updateEnrollmentStatusSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateEnrollmentStatusService(data, user.id)
  })

export const setEnrollmentSpecialCase = createServerFn({ method: 'POST' })
  .validator(setEnrollmentSpecialCaseSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setEnrollmentSpecialCaseService(data, user.id)
  })

export const deleteEnrollment = createServerFn({ method: 'POST' })
  .validator(deleteEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteEnrollmentService(data, user.id)
  })

export const sendInvitationForEnrollment = createServerFn({ method: 'POST' })
  .validator(sendInvitationForEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return sendInvitationForEnrollmentService(data, user.id, user.email)
  })

export const setEvaluationScore = createServerFn({ method: 'POST' })
  .validator(setEvaluationScoreSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await setEvaluationScoreService(data, user.id)
  })

export const setEvaluationAdmissionCategory = createServerFn({ method: 'POST' })
  .validator(setEvaluationAdmissionCategorySchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setEvaluationAdmissionCategoryService(data, user.id)
  })

export const setEvaluationNote = createServerFn({ method: 'POST' })
  .validator(setEvaluationNoteSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setEvaluationNoteService(data, user.id)
  })

export const distributeEnrollments = createServerFn({ method: 'POST' })
  .validator(distributeEnrollmentsSchema)
  .handler(async () => {
    const user = await getCurrentUser()
    return distributeEnrollmentsService(user.id)
  })

export const substituteTeacher = createServerFn({ method: 'POST' })
  .validator(substituteTeacherSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return substituteTeacherService(data, user.id)
  })

export const endSubstitution = createServerFn({ method: 'POST' })
  .validator(endSubstitutionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return endSubstitutionService(data, user.id)
  })

export const getActiveSubstitutedTeacherIds = createServerFn({
  method: 'GET',
}).handler(async () => {
  const user = await getCurrentUser()
  return getActiveSubstitutedTeacherIdsService(user.id)
})

export const getEnrollmentEmails = createServerFn({ method: 'POST' })
  .validator(getEnrollmentEmailsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getEnrollmentEmailsService(data, user.id)
  })

export const searchEnrollmentContactsByNames = createServerFn({
  method: 'POST',
})
  .validator(searchEnrollmentContactsByNamesSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return searchEnrollmentContactsByNamesService(data, user.id)
  })

export const bulkGradeEnrollments = createServerFn({ method: 'POST' })
  .validator(bulkGradeEnrollmentsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return bulkGradeEnrollmentsService(data, user.id)
  })
