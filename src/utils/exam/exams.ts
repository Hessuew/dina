import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  createExamSchema,
  finalizeGradingSchema,
  getAttemptForGradingSchema,
  getAttemptForTakingSchema,
  getExamSchema,
  gradeOpenAnswerSchema,
  listAttemptsForGradingSchema,
  publishExamSchema,
  saveAnswerSchema,
  saveExamChangesSchema,
  startAttemptSchema,
  submitAttemptSchema,
} from '@/schemas/exam.schema'
import {
  createExamService,
  finalizeGradingService,
  getAttemptForGradingService,
  getAttemptForTakingService,
  getExamForAuthorService,
  getExamsForStudentService,
  getExamsForTeacherService,
  gradeOpenAnswerService,
  listAttemptsForGradingService,
  publishExamService,
  saveAnswerService,
  saveExamChangesService,
  startAttemptService,
  submitAttemptService,
} from '@/utils/exam/service/exam.service'

export const createExam = createServerFn({ method: 'POST' })
  .inputValidator(createExamSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createExamService(data, user.id)
  })

export const publishExam = createServerFn({ method: 'POST' })
  .inputValidator(publishExamSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return publishExamService(data, user.id)
  })

export const saveExamChanges = createServerFn({ method: 'POST' })
  .inputValidator(saveExamChangesSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return saveExamChangesService(data, user.id)
  })

export const getExamForAuthor = createServerFn({ method: 'GET' })
  .inputValidator(getExamSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getExamForAuthorService(data, user.id)
  })

export const getExamsForTeacher = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getExamsForTeacherService(user.id)
  },
)

export const getExamsForStudent = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getExamsForStudentService(user.id)
  },
)

export const startExamAttempt = createServerFn({ method: 'POST' })
  .inputValidator(startAttemptSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return startAttemptService(data, user.id)
  })

export const getExamAttemptForTaking = createServerFn({ method: 'GET' })
  .inputValidator(getAttemptForTakingSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getAttemptForTakingService(data, user.id)
  })

export const saveExamAnswer = createServerFn({ method: 'POST' })
  .inputValidator(saveAnswerSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return saveAnswerService(data, user.id)
  })

export const submitExamAttempt = createServerFn({ method: 'POST' })
  .inputValidator(submitAttemptSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return submitAttemptService(data, user.id)
  })

export const listExamAttemptsForGrading = createServerFn({ method: 'GET' })
  .inputValidator(listAttemptsForGradingSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return listAttemptsForGradingService(data, user.id)
  })

export const getExamAttemptForGrading = createServerFn({ method: 'GET' })
  .inputValidator(getAttemptForGradingSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getAttemptForGradingService(data, user.id)
  })

export const gradeExamOpenAnswer = createServerFn({ method: 'POST' })
  .inputValidator(gradeOpenAnswerSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return gradeOpenAnswerService(data, user.id)
  })

export const finalizeExamGrading = createServerFn({ method: 'POST' })
  .inputValidator(finalizeGradingSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return finalizeGradingService(data, user.id)
  })
