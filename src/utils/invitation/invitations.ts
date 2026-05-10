import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { render } from '@react-email/render'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  AppError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
import { getDb } from '@/db'
import { env } from '@/env'
import { invitations, profiles } from '@/db/schema'
import { InvitationEmail } from '@/emails/InvitationEmail'
import {
  checkInvitationByEmailSchema,
  createInvitationSchema,
  deleteInvitationSchema,
  getInvitationByTokenSchema,
  resendInvitationSchema,
  revokeInvitationSchema,
} from '@/schemas/invitation.schema'

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export const createInvitation = createServerFn({ method: 'POST' })
  .inputValidator(createInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      throw new AuthorizationError('Only admins can create invitations', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Non-admin attempted to create invitation',
        details: { role: profile?.role },
      })
    }

    const existingInvitation = await db.query.invitations.findFirst({
      where: eq(invitations.email, data.email),
    })

    if (existingInvitation && existingInvitation.status === 'pending') {
      throw new ConflictError('Invitation already exists for this email', {
        code: 'INVITATION_EXISTS',
        details: { email: data.email },
      })
    }

    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.email, data.email),
    })

    if (existingProfile) {
      throw new ConflictError('User already registered with this email', {
        code: 'INVITATION_EXISTS',
        details: { email: data.email },
      })
    }

    // Generate secure token and expiry (7 days)
    const token = generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Store invitation record in database
    const [invitation] = await db
      .insert(invitations)
      .values({
        email: data.email,
        role: data.role,
        token,
        expiresAt,
        status: 'pending',
        invitedBy: user.id,
      })
      .returning()

    // Generate invite link
    const inviteLink = `${env.APP_URL || 'http://localhost:3000'}/signup?token=${token}`

    // Send invitation email via Resend
    const emailHtml = await render(
      InvitationEmail({
        invitedByName: profile.fullName || profile.email,
        role: data.role,
        inviteLink,
      }),
    )

    const resend = new Resend(env.RESEND_API_KEY)
    const { error: emailError } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: data.email,
      subject: `You've been invited to join our Learning Platform`,
      html: emailHtml,
    })

    if (emailError) {
      // Delete the invitation if email fails
      await db.delete(invitations).where(eq(invitations.id, invitation.id))
      throw new AppError({
        code: 'STORAGE_UPLOAD_FAILED',
        status: 500,
        userMessage: 'Failed to send invitation email',
        internalMessage: `Resend API error: ${emailError.message}`,
      })
    }

    return { invitation }
  })

export const checkInvitationByEmail = createServerFn({ method: 'GET' })
  .inputValidator(checkInvitationByEmailSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.email, data.email),
    })

    if (!invitation) {
      throw new NotFoundError('No invitation found for this email', {
        details: { email: data.email },
      })
    }

    if (invitation.status !== 'pending') {
      throw new ConflictError(
        'This invitation has already been used or revoked',
        {
          code: 'INVITATION_EXISTS',
          details: { email: data.email, status: invitation.status },
        },
      )
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      throw new ValidationError('This invitation has expired', {
        code: 'INVITATION_EXPIRED',
        details: { email: data.email, expiresAt: invitation.expiresAt },
      })
    }

    return {
      invitation: {
        email: invitation.email,
        role: invitation.role,
      },
    }
  })

export const getInvitationByToken = createServerFn({ method: 'GET' })
  .inputValidator(getInvitationByTokenSchema)
  .handler(async ({ data }) => {
    if (!data.token) {
      throw new ValidationError('No token provided', {
        details: { token: data.token },
      })
    }

    const db = await getDb()
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.token, data.token),
    })

    if (!invitation) {
      throw new NotFoundError('Invalid invitation token', {
        details: { token: data.token },
      })
    }

    if (invitation.status !== 'pending') {
      throw new ConflictError(
        'This invitation has already been used or revoked',
        {
          code: 'INVITATION_EXISTS',
          details: { token: data.token, status: invitation.status },
        },
      )
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      throw new ValidationError('This invitation has expired', {
        code: 'INVITATION_EXPIRED',
        details: { token: data.token, expiresAt: invitation.expiresAt },
      })
    }

    return {
      invitation: {
        email: invitation.email,
        role: invitation.role,
      },
    }
  })

export const getInvitations = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      throw new AuthorizationError('Only admins can view invitations', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Non-admin attempted to view invitations',
        details: { role: profile?.role },
      })
    }

    const allInvitations = await db.query.invitations.findMany({
      with: {
        inviter: {
          columns: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: (inv, { desc }) => [desc(inv.invitedAt)],
    })

    return { invitations: allInvitations }
  },
)

export const getInvitationByEmail = createServerFn({ method: 'GET' })
  .inputValidator(checkInvitationByEmailSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.email, data.email),
    })

    if (!invitation) {
      throw new NotFoundError('No invitation found for this email', {
        details: { email: data.email },
      })
    }

    return { invitation }
  })

export const revokeInvitation = createServerFn({ method: 'POST' })
  .inputValidator(revokeInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      throw new AuthorizationError('Only admins can revoke invitations', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Non-admin attempted to revoke invitation',
        details: { role: profile?.role },
      })
    }

    await db
      .update(invitations)
      .set({
        status: 'revoked',
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, data.id))

    return
  })

export const deleteInvitation = createServerFn({ method: 'POST' })
  .inputValidator(deleteInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      throw new AuthorizationError('Only admins can delete invitations', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Non-admin attempted to delete invitation',
        details: { role: profile?.role },
      })
    }

    await db.delete(invitations).where(eq(invitations.id, data.id))

    return
  })

export const resendInvitation = createServerFn({ method: 'POST' })
  .inputValidator(resendInvitationSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      throw new AuthorizationError('Only admins can resend invitations', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Non-admin attempted to resend invitation',
        details: { role: profile?.role },
      })
    }

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, data.id),
    })

    if (!invitation) {
      throw new NotFoundError('Invitation not found', {
        details: { invitationId: data.id },
      })
    }

    // Generate new token and extend expiry
    const token = generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Update email if provided
    const emailToUse = data.email || invitation.email

    // Update invitation
    await db
      .update(invitations)
      .set({
        email: emailToUse,
        token,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, data.id))

    // Generate invite link
    const inviteLink = `${env.APP_URL || 'http://localhost:3000'}/signup?token=${token}`

    // Send invitation email via Resend
    const emailHtml = await render(
      InvitationEmail({
        invitedByName: profile.fullName || profile.email,
        role: invitation.role as 'student' | 'teacher',
        inviteLink,
      }),
    )

    const resend = new Resend(env.RESEND_API_KEY)
    const { error: emailError } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: emailToUse,
      subject: `You've been invited to join our Learning Platform`,
      html: emailHtml,
    })

    if (emailError) {
      throw new AppError({
        code: 'STORAGE_UPLOAD_FAILED',
        status: 500,
        userMessage: 'Failed to send invitation email',
        internalMessage: `Resend API error: ${emailError.message}`,
      })
    }

    return
  })
