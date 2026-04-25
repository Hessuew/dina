import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { render } from '@react-email/render'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { getCurrentUser } from './auth'
import { getDb } from '@/db'
import { env } from '@/env'
import { invitations, profiles } from '@/db/schema'
import {
  checkInvitationByEmailSchema,
  createInvitationSchema,
  deleteInvitationSchema,
  getInvitationByTokenSchema,
  resendInvitationSchema,
  revokeInvitationSchema,
} from '@/schemas/invitation.schema'
import { InvitationEmail } from '@/emails/InvitationEmail'

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
      return { error: true, message: 'Only admins can create invitations' }
    }

    const existingInvitation = await db.query.invitations.findFirst({
      where: eq(invitations.email, data.email),
    })

    if (existingInvitation && existingInvitation.status === 'pending') {
      return {
        error: true,
        message: 'Invitation already exists for this email',
      }
    }

    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.email, data.email),
    })

    if (existingProfile) {
      return { error: true, message: 'User already registered with this email' }
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
      return { error: true, message: 'Failed to send invitation email' }
    }

    return { error: false, invitation }
  })

export const checkInvitationByEmail = createServerFn({ method: 'GET' })
  .inputValidator(checkInvitationByEmailSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.email, data.email),
    })

    if (!invitation) {
      return { error: true, message: 'No invitation found for this email' }
    }

    if (invitation.status !== 'pending') {
      return {
        error: true,
        message: 'This invitation has already been used or revoked',
      }
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return { error: true, message: 'This invitation has expired' }
    }

    return {
      error: false,
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
      return { error: true, message: 'No token provided' }
    }

    const db = await getDb()
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.token, data.token),
    })

    if (!invitation) {
      return { error: true, message: 'Invalid invitation token' }
    }

    if (invitation.status !== 'pending') {
      return {
        error: true,
        message: 'This invitation has already been used or revoked',
      }
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      return { error: true, message: 'This invitation has expired' }
    }

    return {
      error: false,
      invitation: {
        email: invitation.email,
        role: invitation.role,
      },
    }
  })

export const getInvitations = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (profile?.role !== 'admin') {
      return { error: true, message: 'Only admins can view invitations' }
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

    return { error: false, invitations: allInvitations }
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
      return { error: true, message: 'No invitation found for this email' }
    }

    return { error: false, invitation }
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
      return { error: true, message: 'Only admins can revoke invitations' }
    }

    await db
      .update(invitations)
      .set({
        status: 'revoked',
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, data.id))

    return { error: false }
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
      return { error: true, message: 'Only admins can delete invitations' }
    }

    await db.delete(invitations).where(eq(invitations.id, data.id))

    return { error: false }
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
      return { error: true, message: 'Only admins can resend invitations' }
    }

    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, data.id),
    })

    if (!invitation) {
      return { error: true, message: 'Invitation not found' }
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
      return { error: true, message: 'Failed to send invitation email' }
    }

    return { error: false }
  })
