import { createServerFn } from '@tanstack/react-start'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  createExamSchema,
  deleteExamSchema,
  deleteQuestionSchema,
  finalizeGradingSchema,
  getAttemptForGradingSchema,
  getAttemptForTakingSchema,
  getExamSchema,
  gradeOpenAnswerSchema,
  listAttemptsForGradingSchema,
  publishExamSchema,
  reorderQuestionsSchema,
  saveAnswerSchema,
  startAttemptSchema,
  submitAttemptSchema,
  updateExamSchema,
  upsertQuestionSchema,
} from '@/schemas/exam.schema'
import {
  createExamService,
  deleteExamService,
  deleteQuestionService,
  finalizeGradingService,
  getAttemptForGradingService,
  getAttemptForTakingService,
  getExamForAuthorService,
  getExamsForStudentService,
  getExamsForTeacherService,
  gradeOpenAnswerService,
  listAttemptsForGradingService,
  publishExamService,
  reorderQuestionsService,
  saveAnswerService,
  startAttemptService,
  submitAttemptService,
  updateExamService,
  upsertQuestionService,
} from '@/utils/exam/service/exam.service'

export const createExam = createServerFn({ method: 'POST' })
  .inputValidator(createExamSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createExamService(data, user.id)
  })

export const updateExam = createServerFn({ method: 'POST' })
  .inputValidator(updateExamSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateExamService(data, user.id)
  })

export const deleteExam = createServerFn({ method: 'POST' })
  .inputValidator(deleteExamSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteExamService(data, user.id)
  })

export const upsertExamQuestion = createServerFn({ method: 'POST' })
  .inputValidator(upsertQuestionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return upsertQuestionService(data, user.id)
  })

export const deleteExamQuestion = createServerFn({ method: 'POST' })
  .inputValidator(deleteQuestionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteQuestionService(data, user.id)
  })

export const reorderExamQuestions = createServerFn({ method: 'POST' })
  .inputValidator(reorderQuestionsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return reorderQuestionsService(data, user.id)
  })

export const publishExam = createServerFn({ method: 'POST' })
  .inputValidator(publishExamSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return publishExamService(data, user.id)
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
