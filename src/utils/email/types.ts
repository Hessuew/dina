export type InvitationEmailMessage = {
  type: 'invitation'
  to: string
  invitedByName: string
  inviteLink: string
  lecturerTitle?: string | null
  role: 'student' | 'teacher'
}

export type SignupOtpEmailMessage = {
  type: 'signupOtp'
  to: string
  otp: string
  expiryMinutes: number
}

export type PasswordResetEmailMessage = {
  type: 'passwordReset'
  to: string
  resetLink: string
  expiryMinutes: number
}

export type EmailChangeVerificationMessage = {
  type: 'emailChangeVerification'
  to: string
  verifyLink: string
}

export type TransactionalEmailMessage =
  | InvitationEmailMessage
  | SignupOtpEmailMessage
  | PasswordResetEmailMessage
  | EmailChangeVerificationMessage

export type EmailDeliveryResult = {
  providerMessageId: string | null
}

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailDeliveryError'
  }
}

/**
 * Boundary for outbound email. Tests inject a fake; production uses Resend.
 */
export interface EmailSender {
  send: (message: TransactionalEmailMessage) => Promise<EmailDeliveryResult>
}
