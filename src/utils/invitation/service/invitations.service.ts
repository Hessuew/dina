import { render } from '@react-email/render'
import { Resend } from 'resend'
import type {
  CheckInvitationByEmailInput,
  CreateInvitationInput,
  DeleteInvitationInput,
  GetInvitationByTokenInput,
  ResendInvitationInput,
  RevokeInvitationInput,
} from '@/schemas/invitation.schema'
import {
  calculateInvitationExpiry,
  generateSecureToken,
  validateInvitationActive,
} from '@/utils/invitation/domain/invitations.domain'
import {
  deleteInvitationById,
  findAllInvitationsWithInviter,
  findInvitationByEmail,
  findInvitationById,
  findInvitationByToken,
  insertInvitation,
  revokeInvitationById,
  updateInvitationById,
} from '@/utils/invitation/repository/invitations.repository'
import { findProfileByEmail } from '@/utils/invitation/repository/profiles.repository'
import { getUserProfile } from '@/utils/auth/auth'
import {
  AppError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from '@/utils/errors'
import { env } from '@/env'
import { InvitationEmail } from '@/emails/InvitationEmail'

async function sendInvitationEmail(
  to: string,
  invitedByName: string,
  role: 'student' | 'teacher',
  token: string,
) {
  const inviteLink = `${env.APP_URL}/signup?token=${token}`
  const emailHtml = await render(
    InvitationEmail({ invitedByName, role, inviteLink }),
  )
  const resend = new Resend(env.RESEND_API_KEY)
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: `You've been invited to join our Learning Platform`,
    html: emailHtml,
  })
}

export async function createInvitationService(
  data: CreateInvitationInput,
  userId: string,
) {
  const profile = await getUserProfile(userId)

  if (profile.role !== 'admin') {
    throw new AuthorizationError('Only admins can create invitations', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-admin attempted to create invitation',
      details: { role: profile.role },
    })
  }

  const existingInvitation = await findInvitationByEmail(data.email)
  if (existingInvitation && existingInvitation.status === 'pending') {
    throw new ConflictError('Invitation already exists for this email', {
      code: 'INVITATION_EXISTS',
      details: { email: data.email },
    })
  }

  const existingProfile = await findProfileByEmail(data.email)
  if (existingProfile) {
    throw new ConflictError('User already registered with this email', {
      code: 'INVITATION_EXISTS',
      details: { email: data.email },
    })
  }

  const token = generateSecureToken()
  const expiresAt = calculateInvitationExpiry(new Date())

  const invitation = await insertInvitation({
    email: data.email,
    role: data.role,
    token,
    expiresAt,
    status: 'pending',
    invitedBy: userId,
  })

  const { error: emailError } = await sendInvitationEmail(
    data.email,
    profile.fullName || profile.email,
    data.role,
    token,
  )

  if (emailError) {
    await deleteInvitationById(invitation.id)
    throw new AppError({
      code: 'EMAIL_SEND_FAILED',
      status: 500,
      userMessage: 'Failed to send invitation email',
      internalMessage: `Resend API error: ${emailError.message}`,
    })
  }

  return { invitation }
}

export async function checkInvitationByEmailService(
  data: CheckInvitationByEmailInput,
) {
  const invitation = await findInvitationByEmail(data.email)

  if (!invitation) {
    throw new NotFoundError('No invitation found for this email', {
      details: { email: data.email },
    })
  }

  validateInvitationActive(invitation, new Date())

  return { invitation: { email: invitation.email, role: invitation.role } }
}

export async function getInvitationByTokenService(
  data: GetInvitationByTokenInput,
) {
  if (!data.token) {
    throw new NotFoundError('No token provided', {
      details: { token: data.token },
    })
  }

  const invitation = await findInvitationByToken(data.token)

  if (!invitation) {
    throw new NotFoundError('Invalid invitation token', {
      details: { token: data.token },
    })
  }

  validateInvitationActive(invitation, new Date())

  return { invitation: { email: invitation.email, role: invitation.role } }
}

export async function getInvitationsService(userId: string) {
  const profile = await getUserProfile(userId)

  if (profile.role !== 'admin') {
    throw new AuthorizationError('Only admins can view invitations', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-admin attempted to view invitations',
      details: { role: profile.role },
    })
  }

  const allInvitations = await findAllInvitationsWithInviter()
  return { invitations: allInvitations }
}

export async function getInvitationByEmailService(
  data: CheckInvitationByEmailInput,
) {
  const invitation = await findInvitationByEmail(data.email)

  if (!invitation) {
    throw new NotFoundError('No invitation found for this email', {
      details: { email: data.email },
    })
  }

  return { invitation }
}

export async function revokeInvitationService(
  data: RevokeInvitationInput,
  userId: string,
) {
  const profile = await getUserProfile(userId)

  if (profile.role !== 'admin') {
    throw new AuthorizationError('Only admins can revoke invitations', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-admin attempted to revoke invitation',
      details: { role: profile.role },
    })
  }

  await revokeInvitationById(data.id)
}

export async function deleteInvitationService(
  data: DeleteInvitationInput,
  userId: string,
) {
  const profile = await getUserProfile(userId)

  if (profile.role !== 'admin') {
    throw new AuthorizationError('Only admins can delete invitations', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-admin attempted to delete invitation',
      details: { role: profile.role },
    })
  }

  await deleteInvitationById(data.id)
}

export async function resendInvitationService(
  data: ResendInvitationInput,
  userId: string,
) {
  const profile = await getUserProfile(userId)

  if (profile.role !== 'admin') {
    throw new AuthorizationError('Only admins can resend invitations', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-admin attempted to resend invitation',
      details: { role: profile.role },
    })
  }

  const invitation = await findInvitationById(data.id)

  if (!invitation) {
    throw new NotFoundError('Invitation not found', {
      details: { invitationId: data.id },
    })
  }

  validateInvitationActive(invitation, new Date())

  const oldToken = invitation.token
  const oldExpiresAt = invitation.expiresAt
  const token = generateSecureToken()
  const expiresAt = calculateInvitationExpiry(new Date())
  const emailToUse = data.email || invitation.email

  await updateInvitationById(data.id, {
    email: emailToUse,
    token,
    expiresAt,
    updatedAt: new Date(),
  })

  const { error: emailError } = await sendInvitationEmail(
    emailToUse,
    profile.fullName || profile.email,
    invitation.role as 'student' | 'teacher',
    token,
  )

  if (emailError) {
    await updateInvitationById(data.id, {
      email: invitation.email,
      token: oldToken,
      expiresAt: oldExpiresAt,
      updatedAt: new Date(),
    })
    throw new AppError({
      code: 'EMAIL_SEND_FAILED',
      status: 500,
      userMessage: 'Failed to send invitation email',
      internalMessage: `Resend API error: ${emailError.message}`,
    })
  }
}
