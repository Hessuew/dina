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
    .max(new Date().getFullYear(), 'Year of birth cannot be in the future'),
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
    'approved',
    'rejected',
    'waitlisted',
    'withdrawn',
    'deferred',
  ]),
})

export const deleteEnrollmentSchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
})

export const sendInvitationForEnrollmentSchema = z.object({
  enrollmentId: z.uuid('Invalid enrollment ID'),
})

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>
export type GetEnrollmentByIdInput = z.infer<typeof getEnrollmentByIdSchema>
export type UpdateEnrollmentStatusInput = z.infer<
  typeof updateEnrollmentStatusSchema
>
export type DeleteEnrollmentInput = z.infer<typeof deleteEnrollmentSchema>
export type SendInvitationForEnrollmentInput = z.infer<
  typeof sendInvitationForEnrollmentSchema
>
