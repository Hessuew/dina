import { z } from 'zod'

function countWords(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).filter(Boolean).length
}

export const createEnrollmentSchema = z.object({
  fullLegalName: z.string().min(1, 'Full legal name is required'),
  preferredName: z.string().optional(),
  yearOfBirth: z.coerce
    .number()
    .int('Year of birth must be a whole number')
    .min(1900, 'Year of birth must be reasonable')
    .refine((year) => year <= new Date().getFullYear(), {
      message: 'Year of birth cannot be in the future',
    }),
  gender: z.enum(['male', 'female'], {
    message: 'Gender must be either male or female',
  }),
  nationalityCitizenship: z.string().optional(),
  phoneWhatsApp: z.string().min(1, 'Phone number is required'),
  email: z.email('Invalid email address'),
  currentCity: z.string().optional(),
  currentCountry: z.string().optional(),
  churchAffiliations: z.string().optional(),
  aboutYourself: z
    .string()
    .min(1, 'This field is required')
    .refine((value) => countWords(value) <= 200, {
      message: 'Must be 200 words or fewer',
    }),
  expectationsAlignment: z
    .string()
    .min(1, 'This field is required')
    .refine((value) => countWords(value) <= 200, {
      message: 'Must be 200 words or fewer',
    }),
})

export const getEnrollmentByIdSchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
})

export const updateEnrollmentStatusSchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
  status: z.enum([
    'pending',
    'under_review',
    'awaiting_approval',
    'approved',
    'rejected',
    'waitlisted',
    'withdrawn',
    'deferred',
  ]),
})

export const setEnrollmentSpecialCaseSchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
  specialCase: z.boolean(),
})

export const deleteEnrollmentSchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
})

export const sendInvitationForEnrollmentSchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
})

const admissionCategorySchema = z.enum(['new', 'emerging', 'established'])

export const setEvaluationScoreSchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
  score: z.number().int().min(0).max(4).nullable(),
})

export const setEvaluationAdmissionCategorySchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
  score: z.union([z.literal(3), z.literal(4)]),
  admissionCategory: admissionCategorySchema,
})

export const setEvaluationNoteSchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
  note: z.string().max(2000, 'Note must be 2000 characters or fewer'),
})

export const ENROLLMENT_SORT_KEYS = [
  'fullLegalName',
  'nationalityCitizenship',
  'yearOfBirth',
  'gender',
  'status',
  'invitationSent',
  'createdAt',
  'evaluationSum',
] as const

export const getEnrollmentsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z
    .union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)])
    .default(10),
  search: z.string().default(''),
  sortBy: z.enum(ENROLLMENT_SORT_KEYS).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  viewAll: z.boolean().default(false),
})

export const distributeEnrollmentsSchema = z.object({})

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>
export type GetEnrollmentByIdInput = z.infer<typeof getEnrollmentByIdSchema>
export type UpdateEnrollmentStatusInput = z.infer<
  typeof updateEnrollmentStatusSchema
>
export type SetEnrollmentSpecialCaseInput = z.infer<
  typeof setEnrollmentSpecialCaseSchema
>
export type DeleteEnrollmentInput = z.infer<typeof deleteEnrollmentSchema>
export type SendInvitationForEnrollmentInput = z.infer<
  typeof sendInvitationForEnrollmentSchema
>
export type GetEnrollmentsInput = z.infer<typeof getEnrollmentsSchema>
export type DistributeEnrollmentsInput = z.infer<
  typeof distributeEnrollmentsSchema
>
export type SetEvaluationScoreInput = z.infer<typeof setEvaluationScoreSchema>
export type SetEvaluationAdmissionCategoryInput = z.infer<
  typeof setEvaluationAdmissionCategorySchema
>
export type SetEvaluationNoteInput = z.infer<typeof setEvaluationNoteSchema>
