import { z } from 'zod'

export const createExamSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  durationMinutes: z
    .number()
    .int()
    .positive('Duration must be positive')
    .optional(),
  opensAt: z.string().min(1, 'Open date is required'),
  closesAt: z.string().min(1, 'Close date is required'),
})

export const updateExamSchema = z.object({
  examId: z.uuid('Invalid exam ID'),
  title: z.string().min(1, 'Title is required').optional(),
  durationMinutes: z
    .number()
    .int()
    .positive('Duration must be positive')
    .optional(),
  opensAt: z.string().min(1).optional(),
  closesAt: z.string().min(1).optional(),
})

export const deleteExamSchema = z.object({
  examId: z.uuid('Invalid exam ID'),
})

export const getExamSchema = z.object({
  examId: z.uuid('Invalid exam ID'),
})

export const publishExamSchema = z.object({
  examId: z.uuid('Invalid exam ID'),
})

const questionOptionSchema = z.object({
  label: z.string().min(1, 'Option label is required'),
  orderIndex: z.number().int().min(0),
  isCorrect: z.boolean(),
})

export const upsertQuestionSchema = z
  .object({
    examId: z.uuid('Invalid exam ID'),
    questionId: z.uuid('Invalid question ID').optional(),
    type: z.enum(['multiple_choice', 'open_ended']),
    prompt: z.string().min(1, 'Question prompt is required'),
    orderIndex: z.number().int().min(0),
    points: z.number().int().positive('Points must be positive').optional(),
    options: z.array(questionOptionSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'multiple_choice') {
      const options = value.options ?? []
      if (options.length < 2) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Multiple choice questions need at least 2 options',
        })
      }
      if (options.filter((option) => option.isCorrect).length !== 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Exactly one option must be marked correct',
        })
      }
    } else if (value.options && value.options.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Open-ended questions cannot have options',
      })
    }
  })

export const deleteQuestionSchema = z.object({
  examId: z.uuid('Invalid exam ID'),
  questionId: z.uuid('Invalid question ID'),
})

export const reorderQuestionsSchema = z.object({
  examId: z.uuid('Invalid exam ID'),
  orderedQuestionIds: z
    .array(z.uuid('Invalid question ID'))
    .min(1, 'At least one question is required'),
})

export const startAttemptSchema = z.object({
  examId: z.uuid('Invalid exam ID'),
})

export const getAttemptForTakingSchema = z.object({
  examId: z.uuid('Invalid exam ID'),
})

export const saveAnswerSchema = z
  .object({
    attemptId: z.uuid('Invalid attempt ID'),
    questionId: z.uuid('Invalid question ID'),
    selectedOptionId: z.uuid('Invalid option ID').optional(),
    textAnswer: z.string().optional(),
  })
  .refine(
    (value) =>
      (value.selectedOptionId === undefined) !==
      (value.textAnswer === undefined),
    { message: 'Provide either a selected option or a text answer' },
  )

export const submitAttemptSchema = z.object({
  attemptId: z.uuid('Invalid attempt ID'),
})

export const listAttemptsForGradingSchema = z.object({
  examId: z.uuid('Invalid exam ID'),
})

export const getAttemptForGradingSchema = z.object({
  attemptId: z.uuid('Invalid attempt ID'),
})

export const gradeOpenAnswerSchema = z.object({
  answerId: z.uuid('Invalid answer ID'),
  awardedPoints: z.number().int().min(0, 'Points must be non-negative'),
})

export const finalizeGradingSchema = z.object({
  attemptId: z.uuid('Invalid attempt ID'),
})

export type CreateExamInput = z.infer<typeof createExamSchema>
export type UpdateExamInput = z.infer<typeof updateExamSchema>
export type DeleteExamInput = z.infer<typeof deleteExamSchema>
export type GetExamInput = z.infer<typeof getExamSchema>
export type PublishExamInput = z.infer<typeof publishExamSchema>
export type UpsertQuestionInput = z.infer<typeof upsertQuestionSchema>
export type DeleteQuestionInput = z.infer<typeof deleteQuestionSchema>
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>
export type StartAttemptInput = z.infer<typeof startAttemptSchema>
export type GetAttemptForTakingInput = z.infer<typeof getAttemptForTakingSchema>
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>
export type ListAttemptsForGradingInput = z.infer<
  typeof listAttemptsForGradingSchema
>
export type GetAttemptForGradingInput = z.infer<
  typeof getAttemptForGradingSchema
>
export type GradeOpenAnswerInput = z.infer<typeof gradeOpenAnswerSchema>
export type FinalizeGradingInput = z.infer<typeof finalizeGradingSchema>
