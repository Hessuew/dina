import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { render } from '@react-email/render'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { getDb } from '@/db'
import { enrollments, invitations, profiles } from '@/db/schema'
import { env } from '@/env'
import { InvitationEmail } from '@/emails/InvitationEmail'
import { getCurrentUser, requireAdmin } from '@/utils/auth'
import {
  createEnrollmentSchema,
  deleteEnrollmentSchema,
  getEnrollmentByIdSchema,
  sendInvitationForEnrollmentSchema,
  updateEnrollmentStatusSchema,
} from '@/schemas/enrollment.schema'

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export const createEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(createEnrollmentSchema)
  .handler(async ({ data }) => {
    const db = await getDb()

    const [enrollment] = await db
      .insert(enrollments)
      .values({
        fullLegalName: data.fullLegalName,
        preferredName: data.preferredName,
        email: data.email,
        yearOfBirth: data.yearOfBirth,
        gender: data.gender,
        nationalityCitizenship: data.nationalityCitizenship,
        phoneWhatsApp: data.phoneWhatsApp,
        currentCity: data.currentCity,
        currentCountry: data.currentCountry,
        churchAffiliations: data.churchAffiliations,
        aboutYourself: data.aboutYourself,
        expectationsAlignment: data.expectationsAlignment,
      })
      .returning()

    return { error: false, enrollment }
  })

export const getEnrollments = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    await requireAdmin(user.id)

    const db = await getDb()

    const allEnrollments = await db.query.enrollments.findMany({
      orderBy: (e, { desc }) => [desc(e.createdAt)],
    })

    return { error: false, enrollments: allEnrollments }
  },
)

export const getEnrollmentById = createServerFn({ method: 'GET' })
  .inputValidator(getEnrollmentByIdSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await requireAdmin(user.id)

    const db = await getDb()

    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, data.enrollmentId),
    })

    if (!enrollment) {
      return { error: true, message: 'Enrollment not found' }
    }

    return { error: false, enrollment }
  })

export const updateEnrollmentStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateEnrollmentStatusSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await requireAdmin(user.id)

    const db = await getDb()

    await db
      .update(enrollments)
      .set({
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, data.enrollmentId))

    return { error: false }
  })

export const deleteEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(deleteEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await requireAdmin(user.id)

    const db = await getDb()

    await db.delete(enrollments).where(eq(enrollments.id, data.enrollmentId))

    return { error: false }
  })

export const sendInvitationForEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(sendInvitationForEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await requireAdmin(user.id)

    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, data.enrollmentId),
    })

    if (!enrollment) {
      return { error: true, message: 'Enrollment not found' }
    }

    const existingInvitation = await db.query.invitations.findFirst({
      where: eq(invitations.email, enrollment.email),
    })

    const token = generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const inviteLink = `${env.APP_URL || 'http://localhost:3000'}/signup?token=${token}`
    const email = profile?.fullName || profile?.email || user.email
    if (!email) {
      return { error: true, message: 'Email not found' }
    }

    const invitedByName: string = email

    const emailHtml = await render(
      InvitationEmail({
        invitedByName,
        role: 'student',
        inviteLink,
      }),
    )

    const resend = new Resend(env.RESEND_API_KEY)

    if (existingInvitation) {
      if (existingInvitation.status !== 'pending') {
        return {
          error: true,
          message: 'An invitation already exists for this email',
        }
      }

      await db
        .update(invitations)
        .set({
          token,
          expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, existingInvitation.id))

      const { error: emailError } = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: enrollment.email,
        subject: `You've been invited to join our Learning Platform`,
        html: emailHtml,
      })

      if (emailError) {
        return { error: true, message: 'Failed to send invitation email' }
      }

      await db
        .update(enrollments)
        .set({
          invitationSent: true,
          invitationId: existingInvitation.id,
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, enrollment.id))

      return { error: false, invitationId: existingInvitation.id }
    }

    const [invitation] = await db
      .insert(invitations)
      .values({
        email: enrollment.email,
        role: 'student',
        token,
        expiresAt,
        status: 'pending',
        invitedBy: user.id,
      })
      .returning()

    const { error: emailError } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: enrollment.email,
      subject: `You've been invited to join our Learning Platform`,
      html: emailHtml,
    })

    if (emailError) {
      await db.delete(invitations).where(eq(invitations.id, invitation.id))
      return { error: true, message: 'Failed to send invitation email' }
    }

    await db
      .update(enrollments)
      .set({
        invitationSent: true,
        invitationId: invitation.id,
        updatedAt: new Date(),
      })
      .where(eq(enrollments.id, enrollment.id))

    return { error: false, invitationId: invitation.id }
  })
