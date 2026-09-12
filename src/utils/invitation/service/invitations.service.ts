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
  validateInvitationPending,
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
  isAppError,
} from '@/utils/errors'
import { env } from '@/env'
import { sendInvitationEmail } from '@/utils/email'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

type InvitationAction =
  | 'createInvitation'
  | 'getInvitations'
  | 'resendInvitation'
  | 'revokeInvitation'
  | 'deleteInvitation'

type InvitationLogContext = {
  action: InvitationAction
  actorId: string
  invitationId?: string
  role?: 'student' | 'teacher'
  startedAt: number
}

type InvitationTokenLogContext = {
  startedAt: number
}

function logInvitationEvent(
  level: 'info' | 'error',
  event: string,
  context: InvitationLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    invitationId: context.invitationId,
    role: context.role,
    ...fields,
  })
}

function logInvitationTokenEvent(
  level: 'info' | 'error',
  event: string,
  context: InvitationTokenLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:getInvitationByToken',
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    ...fields,
  })
}

function shouldLogInvitationReadFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

async function sendInvitationEmailOrThrow(input: {
  to: string
  invitedByName: string
  role: 'student' | 'teacher'
  token: string
  lecturerTitle?: string | null
}) {
  try {
    await sendInvitationEmail({
      ...input,
      appUrl: env.APP_URL || 'http://localhost:3000',
    })
  } catch (error) {
    throw new AppError({
      code: 'EMAIL_SEND_FAILED',
      status: 500,
      userMessage: 'Failed to send invitation email',
      internalMessage:
        error instanceof Error ? error.message : 'Email provider error',
    })
  }
}

async function insertInvitationOrLogFailure(input: {
  data: CreateInvitationInput
  token: string
  expiresAt: Date
  userId: string
  context: InvitationLogContext
}) {
  try {
    return await insertInvitation({
      email: input.data.email,
      role: input.data.role,
      token: input.token,
      expiresAt: input.expiresAt,
      status: 'pending',
      invitedBy: input.userId,
    })
  } catch (error) {
    logInvitationEvent('error', 'invitation_create_failed', input.context, {
      errorCategory: 'invitation_persistence',
    })
    throw error
  }
}

async function sendCreatedInvitationOrRollback(input: {
  data: CreateInvitationInput
  profile: Awaited<ReturnType<typeof getUserProfile>>
  token: string
  invitationId: string
  context: InvitationLogContext
}) {
  try {
    await sendInvitationEmailOrThrow({
      to: input.data.email,
      invitedByName: input.profile.fullName || input.profile.email,
      role: input.data.role,
      token: input.token,
      lecturerTitle: input.profile.lecturerTitle,
    })
  } catch (error) {
    logInvitationEvent('error', 'invitation_create_failed', input.context, {
      errorCategory: 'invitation_email_delivery',
    })
    await deleteInvitationById(input.invitationId)
    throw error
  }
}

export async function createInvitationService(
  data: CreateInvitationInput,
  userId: string,
) {
  const context: InvitationLogContext = {
    action: 'createInvitation',
    actorId: userId,
    role: data.role,
    startedAt: performance.now(),
  }
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
  const invitation = await insertInvitationOrLogFailure({
    data,
    token,
    expiresAt,
    userId,
    context,
  })
  context.invitationId = invitation.id
  await sendCreatedInvitationOrRollback({
    data,
    profile,
    token,
    invitationId: invitation.id,
    context,
  })
  logInvitationEvent('info', 'invitation_created', context)
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
  const context: InvitationTokenLogContext = {
    startedAt: performance.now(),
  }
  if (!data.token) {
    throw new NotFoundError('No token provided', {
      details: { token: data.token },
    })
  }

  let invitation
  try {
    invitation = await findInvitationByToken(data.token)
  } catch (error) {
    if (shouldLogInvitationReadFailure(error)) {
      logInvitationTokenEvent(
        'error',
        'invitation_token_lookup_failed',
        context,
        {
          errorCategory: 'invitation_token_read_persistence',
        },
      )
    }
    throw error
  }

  if (!invitation) {
    throw new NotFoundError('Invalid invitation token', {
      details: { token: data.token },
    })
  }

  validateInvitationActive(invitation, new Date())

  logInvitationTokenEvent('info', 'invitation_token_validated', context, {
    invitationId: invitation.id,
    role: invitation.role,
  })

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

  const context: InvitationLogContext = {
    action: 'getInvitations',
    actorId: userId,
    startedAt: performance.now(),
  }

  try {
    const allInvitations = await findAllInvitationsWithInviter()
    logInvitationEvent('info', 'invitations_loaded', context, {
      invitationCount: allInvitations.length,
    })
    return { invitations: allInvitations }
  } catch (error) {
    if (shouldLogInvitationReadFailure(error)) {
      logInvitationEvent('error', 'invitations_load_failed', context, {
        errorCategory: 'invitation_read_persistence',
      })
    }
    throw error
  }
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
  const context: InvitationLogContext = {
    action: 'revokeInvitation',
    actorId: userId,
    invitationId: data.id,
    startedAt: performance.now(),
  }
  const profile = await getUserProfile(userId)

  if (profile.role !== 'admin') {
    throw new AuthorizationError('Only admins can revoke invitations', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-admin attempted to revoke invitation',
      details: { role: profile.role },
    })
  }

  try {
    await revokeInvitationById(data.id)
  } catch (error) {
    logInvitationEvent('error', 'invitation_revoke_failed', context, {
      errorCategory: 'invitation_persistence',
    })
    throw error
  }
  logInvitationEvent('info', 'invitation_revoked', context)
}

export async function deleteInvitationService(
  data: DeleteInvitationInput,
  userId: string,
) {
  const context: InvitationLogContext = {
    action: 'deleteInvitation',
    actorId: userId,
    invitationId: data.id,
    startedAt: performance.now(),
  }
  const profile = await getUserProfile(userId)

  if (profile.role !== 'admin') {
    throw new AuthorizationError('Only admins can delete invitations', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-admin attempted to delete invitation',
      details: { role: profile.role },
    })
  }

  try {
    await deleteInvitationById(data.id)
  } catch (error) {
    logInvitationEvent('error', 'invitation_delete_failed', context, {
      errorCategory: 'invitation_persistence',
    })
    throw error
  }
  logInvitationEvent('info', 'invitation_deleted', context)
}

export async function resendInvitationService(
  data: ResendInvitationInput,
  userId: string,
) {
  const context: InvitationLogContext = {
    action: 'resendInvitation',
    actorId: userId,
    invitationId: data.id,
    startedAt: performance.now(),
  }
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

  validateInvitationPending(invitation)
  context.role = invitation.role as 'student' | 'teacher'

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

  try {
    await sendInvitationEmailOrThrow({
      to: emailToUse,
      invitedByName: profile.fullName || profile.email,
      role: invitation.role as 'student' | 'teacher',
      token,
      lecturerTitle: profile.lecturerTitle,
    })
  } catch (error) {
    logInvitationEvent('error', 'invitation_resend_failed', context, {
      errorCategory: 'invitation_email_delivery',
    })
    await updateInvitationById(data.id, {
      email: invitation.email,
      token: oldToken,
      expiresAt: oldExpiresAt,
      updatedAt: new Date(),
    })
    throw error
  }

  logInvitationEvent('info', 'invitation_resent', context)
}
