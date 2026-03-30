import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.email('Invalid email address'),
  bio: z.string().optional(),
})

export const updatePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
