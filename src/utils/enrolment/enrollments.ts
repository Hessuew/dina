import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  createEnrollmentSchema,
  deleteEnrollmentSchema,
  distributeEnrollmentsSchema,
  endSubstitutionSchema,
  getEnrollmentByIdSchema,
  getEnrollmentEmailsSchema,
  getEnrollmentsSchema,
  sendInvitationForEnrollmentSchema,
  setEnrollmentSpecialCaseSchema,
  setEvaluationAdmissionCategorySchema,
  setEvaluationNoteSchema,
  setEvaluationScoreSchema,
  substituteTeacherSchema,
  updateEnrollmentStatusSchema,
} from '@/schemas/enrollment.schema'
import {
  createEnrollmentService,
  deleteEnrollmentService,
  distributeEnrollmentsService,
  endSubstitutionService,
  getEnrollmentByIdService,
  getEnrollmentEmailsService,
  getEnrollmentsService,
  sendInvitationForEnrollmentService,
  setEnrollmentSpecialCaseService,
  setEvaluationAdmissionCategoryService,
  setEvaluationNoteService,
  setEvaluationScoreService,
  substituteTeacherService,
  updateEnrollmentStatusService,
} from '@/utils/enrolment/service/enrolment.service'
import { findAbsentTeacherIdsWithActiveSubstitution } from '@/utils/enrolment/repository/enrolment.repository'

const ENROLLMENT_OPEN = false as boolean

export const createEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(createEnrollmentSchema)
  .handler(({ data }) => {
    if (!ENROLLMENT_OPEN) throw new Error('Enrollment is currently closed.')
    return createEnrollmentService(data)
  })

export const getEnrollments = createServerFn({ method: 'POST' })
  .inputValidator(getEnrollmentsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getEnrollmentsService(data, user.id)
  })

export const getEnrollmentById = createServerFn({ method: 'GET' })
  .inputValidator(getEnrollmentByIdSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getEnrollmentByIdService(data, user.id)
  })

export const updateEnrollmentStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateEnrollmentStatusSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateEnrollmentStatusService(data, user.id)
  })

export const setEnrollmentSpecialCase = createServerFn({ method: 'POST' })
  .inputValidator(setEnrollmentSpecialCaseSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setEnrollmentSpecialCaseService(data, user.id)
  })

export const deleteEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(deleteEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteEnrollmentService(data, user.id)
  })

export const sendInvitationForEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(sendInvitationForEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return sendInvitationForEnrollmentService(data, user.id, user.email)
  })

export const setEvaluationScore = createServerFn({ method: 'POST' })
  .inputValidator(setEvaluationScoreSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await setEvaluationScoreService(data, user.id)
  })

export const setEvaluationAdmissionCategory = createServerFn({ method: 'POST' })
  .inputValidator(setEvaluationAdmissionCategorySchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setEvaluationAdmissionCategoryService(data, user.id)
  })

export const setEvaluationNote = createServerFn({ method: 'POST' })
  .inputValidator(setEvaluationNoteSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setEvaluationNoteService(data, user.id)
  })

export const distributeEnrollments = createServerFn({ method: 'POST' })
  .inputValidator(distributeEnrollmentsSchema)
  .handler(async () => {
    const user = await getCurrentUser()
    return distributeEnrollmentsService(user.id)
  })

export const substituteTeacher = createServerFn({ method: 'POST' })
  .inputValidator(substituteTeacherSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return substituteTeacherService(data, user.id)
  })

export const endSubstitution = createServerFn({ method: 'POST' })
  .inputValidator(endSubstitutionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return endSubstitutionService(data, user.id)
  })

export const getActiveSubstitutedTeacherIds = createServerFn({
  method: 'GET',
}).handler(async () => {
  const teacherIds = await findAbsentTeacherIdsWithActiveSubstitution()
  return { teacherIds }
})

export const getEnrollmentEmails = createServerFn({ method: 'POST' })
  .inputValidator(getEnrollmentEmailsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getEnrollmentEmailsService(data, user.id)
  })
