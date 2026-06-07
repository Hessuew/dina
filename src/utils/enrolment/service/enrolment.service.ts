import { render } from '@react-email/render'
import { Resend } from 'resend'
import type {
  CreateEnrollmentInput,
  DeleteEnrollmentInput,
  GetEnrollmentByIdInput,
  GetEnrollmentsInput,
  SendInvitationForEnrollmentInput,
  SetEnrollmentSpecialCaseInput,
  SetEvaluationAdmissionCategoryInput,
  SetEvaluationNoteInput,
  SetEvaluationScoreInput,
  UpdateEnrollmentStatusInput,
} from '@/schemas/enrollment.schema'
import type {
  EnrollmentWithEvaluation,
  MaybeRedactedEnrollment,
} from '@/utils/enrolment/domain/enrolment.domain'
import {
  buildEnrollmentAssignments,
  deriveEnrollmentStatusFromReviewerScore,
  derivePeerReviewState,
  generateInvitationExpiry,
  generateSecureToken,
  isInvitationResendable,
  redactEnrollmentForTeacher,
} from '@/utils/enrolment/domain/enrolment.domain'
import {
  bulkAssignEnrollments,
  deleteEnrollmentById,
  deleteInvitationById,
  findAllTeacherIds,
  findEnrollmentById,
  findEnrollmentsPage,
  findEvaluationsForEnrollments,
  findInvitationByEmail,
  findPeerTeacherIds,
  findProfileById,
  findReviewerIdForEnrollment,
  findUnassignedEnrollmentIds,
  insertEnrollment,
  insertInvitation,
  markEnrollmentInvitationSent,
  updateEnrollmentSpecialCaseById,
  updateEnrollmentStatusById,
  updateInvitationToken,
  upsertEvaluation,
} from '@/utils/enrolment/repository/enrolment.repository'
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
import { env } from '@/env'
import { InvitationEmail } from '@/emails/InvitationEmail'

/**
 * Throws if a non-admin user is not authorized to evaluate the given enrollment.
 * Eligible callers: the assigned Reviewer, or a peer teacher (course partner).
 * Admins bypass the check entirely.
 */
export async function assertEvaluationAuthorized(
  enrollmentId: string,
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  if (isAdmin) return
  const reviewerId = await findReviewerIdForEnrollment(enrollmentId)
  const peerIds = reviewerId ? await findPeerTeacherIds(reviewerId) : []
  if (reviewerId !== userId && !peerIds.includes(userId)) {
    throw new AuthorizationError('not authorized to evaluate this enrollment', {
      code: 'ACTION_NOT_ALLOWED',
      details: { enrollmentId },
    })
  }
}

/**
 * Records the caller's Enrollment Evaluation score, then — only when the caller is
 * the assigned Reviewer — auto-derives and persists the enrollment status from that
 * score (ADR 0008). Peer / non-assigned evaluators stay advisory and never move
 * status. Frozen admin decisions are left untouched (the derive returns null).
 */
export async function setEvaluationScoreService(
  data: SetEvaluationScoreInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
    if (!isAdmin && !isTeacher) {
      throw new AuthorizationError('admin or teacher access required', {
        code: 'ROLE_REQUIRED',
        details: {},
      })
    }

    // Fetch reviewerId once — reused for both the authz check and status derivation.
    const reviewerId = await findReviewerIdForEnrollment(data.enrollmentId)

    if (!isAdmin) {
      const peerIds = reviewerId ? await findPeerTeacherIds(reviewerId) : []
      if (reviewerId !== userId && !peerIds.includes(userId)) {
        throw new AuthorizationError(
          'not authorized to evaluate this enrollment',
          {
            code: 'ACTION_NOT_ALLOWED',
            details: { enrollmentId: data.enrollmentId },
          },
        )
      }
    }

    await upsertEvaluation(data.enrollmentId, userId, { score: data.score })

    if (reviewerId === userId) {
      const enrollment = await findEnrollmentById(data.enrollmentId)
      if (enrollment) {
        const nextStatus = deriveEnrollmentStatusFromReviewerScore(
          data.score,
          enrollment.status,
        )
        if (nextStatus !== null) {
          await updateEnrollmentStatusById(data.enrollmentId, nextStatus)
        }
      }
    }
  })
}

export async function createEnrollmentService(data: CreateEnrollmentInput) {
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
}

export async function getEnrollmentsService(
  data: GetEnrollmentsInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
    if (!isAdmin && !isTeacher) {
      throw new AuthorizationError('admin or teacher access required', {
        code: 'ROLE_REQUIRED',
        details: {},
      })
    }

    const reviewerFilter = isAdmin && data.viewAll ? undefined : userId

    const peerIds =
      reviewerFilter !== undefined ? await findPeerTeacherIds(userId) : []

    const { rows, total } = await findEnrollmentsPage({
      limit: data.pageSize,
      offset: (data.page - 1) * data.pageSize,
      search: data.search,
      sortBy: data.sortBy,
      sortDir: data.sortDir,
      includeEmail: isAdmin,
      reviewerFilter,
      peerIds,
    })

    const evaluations = await findEvaluationsForEnrollments(
      rows.map((row) => row.id),
    )

    const enrollmentsOut: Array<EnrollmentWithEvaluation> = rows.map((row) => {
      const { evaluationSum, evaluationCount, ...enrollment } = row
      const base = isAdmin
        ? (enrollment as MaybeRedactedEnrollment)
        : redactEnrollmentForTeacher(enrollment)
      const peerReviewState = derivePeerReviewState(
        evaluations.filter((e) => e.enrollmentId === row.id),
        userId,
        peerIds,
      )
      return { ...base, evaluationSum, evaluationCount, peerReviewState }
    })

    return { enrollments: enrollmentsOut, total, evaluations }
  })
}

export async function getEnrollmentByIdService(
  data: GetEnrollmentByIdInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
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
}

export async function updateEnrollmentStatusService(
  data: UpdateEnrollmentStatusInput,
  userId: string,
) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')

    await updateEnrollmentStatusById(data.enrollmentId, data.status)

    return
  })
}

export async function setEnrollmentSpecialCaseService(
  data: SetEnrollmentSpecialCaseInput,
  userId: string,
) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')

    await updateEnrollmentSpecialCaseById(data.enrollmentId, data.specialCase)

    return
  })
}

export async function deleteEnrollmentService(
  data: DeleteEnrollmentInput,
  userId: string,
) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')

    await deleteEnrollmentById(data.enrollmentId)

    return
  })
}

export async function sendInvitationForEnrollmentService(
  data: SendInvitationForEnrollmentInput,
  userId: string,
  userEmail: string | undefined,
) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')

    const profile = await findProfileById(userId)

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
    const senderName = profile?.fullName || profile?.email || userEmail
    if (!senderName) {
      throw new ValidationError('Email not found', {
        details: { userId, profileId: profile?.id },
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
        throw new ConflictError('An invitation already exists for this email', {
          code: 'INVITATION_EXISTS',
          details: {
            email: enrollment.email,
            status: existingInvitation.status,
          },
        })
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
      invitedBy: userId,
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
}

export async function setEvaluationAdmissionCategoryService(
  data: SetEvaluationAdmissionCategoryInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
    if (!isAdmin && !isTeacher) {
      throw new AuthorizationError('admin or teacher access required', {
        code: 'ROLE_REQUIRED',
        details: {},
      })
    }

    await assertEvaluationAuthorized(data.enrollmentId, userId, isAdmin)

    await upsertEvaluation(data.enrollmentId, userId, {
      admissionCategory: data.admissionCategory,
    })

    return
  })
}

export async function setEvaluationNoteService(
  data: SetEvaluationNoteInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
    if (!isAdmin && !isTeacher) {
      throw new AuthorizationError('admin or teacher access required', {
        code: 'ROLE_REQUIRED',
        details: {},
      })
    }

    await assertEvaluationAuthorized(data.enrollmentId, userId, isAdmin)

    await upsertEvaluation(data.enrollmentId, userId, { note: data.note })

    return
  })
}

export async function distributeEnrollmentsService(userId: string) {
  return withRequestCache(async () => {
    await authz(userId).hasRole('admin')
    const [unassignedIds, teacherIds] = await Promise.all([
      findUnassignedEnrollmentIds(),
      findAllTeacherIds(),
    ])
    if (teacherIds.length === 0 || unassignedIds.length === 0) {
      return { assigned: 0 }
    }
    const assignments = buildEnrollmentAssignments(unassignedIds, teacherIds)
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
}
