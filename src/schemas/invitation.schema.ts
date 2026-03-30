import { z } from 'zod'

export const createInvitationSchema = z.object({
  email: z.email('Invalid email address'),
  role: z.enum(['student', 'teacher'], {
    message: 'Role must be either student or teacher',
  }),
})

export const resendInvitationSchema = z.object({
  id: z.uuid('Invalid invitation ID'),
  email: z.email('Invalid email address').optional(),
})

export const revokeInvitationSchema = z.object({
  id: z.uuid('Invalid invitation ID'),
})

export const deleteInvitationSchema = z.object({
  id: z.uuid('Invalid invitation ID'),
})

export const checkInvitationByEmailSchema = z.object({
  email: z.email('Invalid email address'),
})

export const getInvitationByTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>
export type ResendInvitationInput = z.infer<typeof resendInvitationSchema>
export type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>
export type DeleteInvitationInput = z.infer<typeof deleteInvitationSchema>
export type CheckInvitationByEmailInput = z.infer<
  typeof checkInvitationByEmailSchema
>
export type GetInvitationByTokenInput = z.infer<
  typeof getInvitationByTokenSchema
>
