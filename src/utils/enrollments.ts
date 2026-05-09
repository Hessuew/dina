import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { render } from '@react-email/render'
import { eq } from 'drizzle-orm'
import { Resend } from 'resend'
import { getDb } from '@/db'
import { enrollments, invitations, profiles } from '@/db/schema'
import { env } from '@/env'
import { InvitationEmail } from '@/emails/InvitationEmail'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
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

    return { enrollment }
  })

export const getEnrollments = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')

      const db = await getDb()

      const allEnrollments = await db.query.enrollments.findMany({
        orderBy: (e, { desc }) => [desc(e.createdAt)],
      })

      return { enrollments: allEnrollments }
    })
  },
)

export const getEnrollmentById = createServerFn({ method: 'GET' })
  .inputValidator(getEnrollmentByIdSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')

      const db = await getDb()

      const enrollment = await db.query.enrollments.findFirst({
        where: eq(enrollments.id, data.enrollmentId),
      })

      if (!enrollment) {
        throw new NotFoundError('Enrollment not found', {
          code: 'ENROLLMENT_NOT_FOUND',
          details: { enrollmentId: data.enrollmentId },
        })
      }

      return { enrollment }
    })
  })

export const updateEnrollmentStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateEnrollmentStatusSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')

      const db = await getDb()

      await db
        .update(enrollments)
        .set({
          status: data.status,
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, data.enrollmentId))

      return
    })
  })

export const deleteEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(deleteEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')

      const db = await getDb()

      await db.delete(enrollments).where(eq(enrollments.id, data.enrollmentId))

      return
    })
  })

export const sendInvitationForEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(sendInvitationForEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')

      const db = await getDb()

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
      })

      const enrollment = await db.query.enrollments.findFirst({
        where: eq(enrollments.id, data.enrollmentId),
      })

      if (!enrollment) {
        throw new NotFoundError('Enrollment not found', {
          code: 'ENROLLMENT_NOT_FOUND',
          details: { enrollmentId: data.enrollmentId },
        })
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
        throw new ValidationError('Email not found', {
          details: { userId: user.id, profileId: profile?.id },
        })
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
          throw new ConflictError(
            'An invitation already exists for this email',
            {
              code: 'INVITATION_EXISTS',
              details: {
                email: enrollment.email,
                status: existingInvitation.status,
              },
            },
          )
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
          throw new AppError({
            code: 'STORAGE_UPLOAD_FAILED',
            status: 500,
            userMessage: 'Failed to send invitation email',
            internalMessage: `Resend API error: ${emailError.message}`,
          })
        }

        await db
          .update(enrollments)
          .set({
            invitationSent: true,
            invitationId: existingInvitation.id,
            updatedAt: new Date(),
          })
          .where(eq(enrollments.id, enrollment.id))

        return { invitationId: existingInvitation.id }
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
        throw new AppError({
          code: 'STORAGE_UPLOAD_FAILED',
          status: 500,
          userMessage: 'Failed to send invitation email',
          internalMessage: `Resend API error: ${emailError.message}`,
        })
      }

      await db
        .update(enrollments)
        .set({
          invitationSent: true,
          invitationId: invitation.id,
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, enrollment.id))

      return { invitationId: invitation.id }
    })
  })
