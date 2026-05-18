import { createServerFn } from '@tanstack/react-start'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import {
  generateInvitationExpiry,
  generateSecureToken,
  isInvitationResendable,
} from '@/utils/enrolment/domain/enrolment.domain'
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
import {
  deleteEnrollmentById,
  deleteInvitationById,
  findAllEnrollments,
  findEnrollmentById,
  findInvitationByEmail,
  findProfileById,
  insertEnrollment,
  insertInvitation,
  markEnrollmentInvitationSent,
  updateEnrollmentStatusById,
  updateInvitationToken,
} from '@/utils/enrolment/repository/enrolment.repository'

export const createEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(createEnrollmentSchema)
  .handler(async ({ data }) => {
    const enrollment = await insertEnrollment({
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

    return { enrollment }
  })

export const getEnrollments = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')

      const allEnrollments = await findAllEnrollments()

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

      const enrollment = await findEnrollmentById(data.enrollmentId)

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

      await updateEnrollmentStatusById(data.enrollmentId, data.status)

      return
    })
  })

export const deleteEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(deleteEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')

      await deleteEnrollmentById(data.enrollmentId)

      return
    })
  })

export const sendInvitationForEnrollment = createServerFn({ method: 'POST' })
  .inputValidator(sendInvitationForEnrollmentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')

      const profile = await findProfileById(user.id)

      const enrollment = await findEnrollmentById(data.enrollmentId)

      if (!enrollment) {
        throw new NotFoundError('Enrollment not found', {
          code: 'ENROLLMENT_NOT_FOUND',
          details: { enrollmentId: data.enrollmentId },
        })
      }

      const existingInvitation = await findInvitationByEmail(enrollment.email)

      const token = generateSecureToken()
      const expiresAt = generateInvitationExpiry()

      const inviteLink = `${env.APP_URL || 'http://localhost:3000'}/signup?token=${token}`
      const senderName = profile?.fullName || profile?.email || user.email
      if (!senderName) {
        throw new ValidationError('Email not found', {
          details: { userId: user.id, profileId: profile?.id },
        })
      }

      const emailHtml = await render(
        InvitationEmail({
          invitedByName: senderName,
          role: 'student',
          inviteLink,
        }),
      )

      const resend = new Resend(env.RESEND_API_KEY)

      if (existingInvitation) {
        if (!isInvitationResendable(existingInvitation)) {
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

        await updateInvitationToken(existingInvitation.id, token, expiresAt)

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

        await markEnrollmentInvitationSent(enrollment.id, existingInvitation.id)

        return { invitationId: existingInvitation.id }
      }

      const invitation = await insertInvitation({
        email: enrollment.email,
        role: 'student',
        token,
        expiresAt,
        status: 'pending',
        invitedBy: user.id,
      })

      const { error: emailError } = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: enrollment.email,
        subject: `You've been invited to join our Learning Platform`,
        html: emailHtml,
      })

      if (emailError) {
        await deleteInvitationById(invitation.id)
        throw new AppError({
          code: 'STORAGE_UPLOAD_FAILED',
          status: 500,
          userMessage: 'Failed to send invitation email',
          internalMessage: `Resend API error: ${emailError.message}`,
        })
      }

      await markEnrollmentInvitationSent(enrollment.id, invitation.id)

      return { invitationId: invitation.id }
    })
  })
