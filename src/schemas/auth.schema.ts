import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().optional(),
  token: z.string().min(1, 'Invitation token is required'),
})

export const verifyOtpSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  invitationToken: z.string().min(1, 'Invitation token is required'),
})

export const resendOtpSchema = z.object({
  email: z.email('Invalid email address'),
  invitationToken: z.string().min(1, 'Invitation token is required'),
})

export const requestPasswordResetSchema = z.object({
  email: z.email('Invalid email address'),
})

export const validateResetTokenSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type ResendOtpInput = z.infer<typeof resendOtpSchema>
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>
export type ValidateResetTokenInput = z.infer<typeof validateResetTokenSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
