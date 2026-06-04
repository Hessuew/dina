import { createServerFn } from '@tanstack/react-start'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import type {
  EnrollmentWithEvaluation,
  MaybeRedactedEnrollment,
} from '@/utils/enrolment/domain/enrolment.domain'
import {
  generateInvitationExpiry,
  generateSecureToken,
  isInvitationResendable,
  redactEnrollmentForTeacher,
} from '@/utils/enrolment/domain/enrolment.domain'
import { env } from '@/env'
import { InvitationEmail } from '@/emails/InvitationEmail'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  authz,
  resolveAdminOrTeacherAccess,
  withRequestCache,
} from '@/utils/authz'
import {
  AppError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
import {
  createEnrollmentSchema,
  deleteEnrollmentSchema,
  distributeEnrollmentsSchema,
  getEnrollmentByIdSchema,
  getEnrollmentsSchema,
  sendInvitationForEnrollmentSchema,
  setEvaluationAdmissionCategorySchema,
  setEvaluationNoteSchema,
  setEvaluationScoreSchema,
  updateEnrollmentStatusSchema,
} from '@/schemas/enrollment.schema'
import {
  bulkAssignEnrollments,
  deleteEnrollmentById,
  deleteInvitationById,
  findAllTeacherIds,
  findEnrollmentById,
  findEnrollmentsPage,
  findEvaluationsForEnrollments,
  findInvitationByEmail,
  findProfileById,
  findUnassignedEnrollmentIds,
  insertEnrollment,
  insertInvitation,
  markEnrollmentInvitationSent,
  updateEnrollmentStatusById,
  updateInvitationToken,
  upsertEvaluation,
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

export const getEnrollments = createServerFn({ method: 'POST' })
  .inputValidator(getEnrollmentsSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(user.id)
      if (!isAdmin && !isTeacher) {
        throw new AuthorizationError('admin or teacher access required', {
          code: 'ROLE_REQUIRED',
          details: {},
        })
      }

      const reviewerFilter = isAdmin && data.viewAll ? undefined : user.id

      const { rows, total } = await findEnrollmentsPage({
        limit: data.pageSize,
        offset: (data.page - 1) * data.pageSize,
        search: data.search,
        sortBy: data.sortBy,
        sortDir: data.sortDir,
        includeEmail: isAdmin,
        reviewerFilter,
      })

      const evaluations = await findEvaluationsForEnrollments(
        rows.map((row) => row.id),
      )

      const enrollmentsOut: Array<EnrollmentWithEvaluation> = rows.map(
        (row) => {
          const { evaluationSum, evaluationCount, ...enrollment } = row
          const base = isAdmin
            ? (enrollment as MaybeRedactedEnrollment)
            : redactEnrollmentForTeacher(enrollment)
          return { ...base, evaluationSum, evaluationCount }
        },
      )

      return { enrollments: enrollmentsOut, total, evaluations }
    })
  })

export const getEnrollmentById = createServerFn({ method: 'GET' })
  .inputValidator(getEnrollmentByIdSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(user.id)
      if (!isAdmin && !isTeacher) {
        throw new AuthorizationError('admin or teacher access required', {
          code: 'ROLE_REQUIRED',
          details: {},
        })
      }

      const enrollment = await findEnrollmentById(data.enrollmentId)

      if (!enrollment) {
        throw new NotFoundError('Enrollment not found', {
          code: 'ENROLLMENT_NOT_FOUND',
          details: { enrollmentId: data.enrollmentId },
        })
      }

      if (!isAdmin) {
        return {
          enrollment: redactEnrollmentForTeacher(
            enrollment,
          ) as MaybeRedactedEnrollment,
        }
      }

      return { enrollment: enrollment as MaybeRedactedEnrollment }
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
          lecturerTitle: profile?.lecturerTitle || null,
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

export const setEvaluationScore = createServerFn({ method: 'POST' })
  .inputValidator(setEvaluationScoreSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(user.id)
      if (!isAdmin && !isTeacher) {
        throw new AuthorizationError('admin or teacher access required', {
          code: 'ROLE_REQUIRED',
          details: {},
        })
      }

      await upsertEvaluation(data.enrollmentId, user.id, { score: data.score })

      return
    })
  })

export const setEvaluationAdmissionCategory = createServerFn({ method: 'POST' })
  .inputValidator(setEvaluationAdmissionCategorySchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(user.id)
      if (!isAdmin && !isTeacher) {
        throw new AuthorizationError('admin or teacher access required', {
          code: 'ROLE_REQUIRED',
          details: {},
        })
      }

      await upsertEvaluation(data.enrollmentId, user.id, {
        score: data.score,
        admissionCategory: data.admissionCategory,
      })

      return
    })
  })

export const setEvaluationNote = createServerFn({ method: 'POST' })
  .inputValidator(setEvaluationNoteSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(user.id)
      if (!isAdmin && !isTeacher) {
        throw new AuthorizationError('admin or teacher access required', {
          code: 'ROLE_REQUIRED',
          details: {},
        })
      }

      await upsertEvaluation(data.enrollmentId, user.id, { note: data.note })

      return
    })
  })

export const distributeEnrollments = createServerFn({ method: 'POST' })
  .inputValidator(distributeEnrollmentsSchema)
  .handler(async () => {
    const user = await getCurrentUser()
    return withRequestCache(async () => {
      await authz(user.id).hasRole('admin')
      const [unassignedIds, teacherIds] = await Promise.all([
        findUnassignedEnrollmentIds(),
        findAllTeacherIds(),
      ])
      if (teacherIds.length === 0 || unassignedIds.length === 0) {
        return { assigned: 0 }
      }
      const batchSize = Math.ceil(unassignedIds.length / teacherIds.length)
      const assignments = unassignedIds.map((enrollmentId, i) => ({
        enrollmentId,
        reviewerId:
          teacherIds[
            Math.min(Math.floor(i / batchSize), teacherIds.length - 1)
          ],
      }))
      try {
        await bulkAssignEnrollments(assignments)
      } catch (error) {
        throw new AppError({
          code: 'DISTRIBUTION_FAILED',
          status: 500,
          userMessage:
            'Failed to distribute enrollments. Please refresh and try again.',
          internalMessage:
            error instanceof Error
              ? error.message
              : 'bulkAssignEnrollments failed',
        })
      }
      return { assigned: assignments.length }
    })
  })
