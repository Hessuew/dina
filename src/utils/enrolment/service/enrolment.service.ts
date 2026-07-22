import type {
  BulkGradeEnrollmentsInput,
  CreateEnrollmentInput,
  DeleteEnrollmentInput,
  EndSubstitutionInput,
  GetEnrollmentByIdInput,
  GetEnrollmentEmailsInput,
  GetEnrollmentsInput,
  SearchEnrollmentContactsByNamesInput,
  SendInvitationForEnrollmentInput,
  SetEnrollmentSpecialCaseInput,
  SetEvaluationAdmissionCategoryInput,
  SetEvaluationNoteInput,
  SetEvaluationScoreInput,
  SubstituteTeacherInput,
  UpdateEnrollmentStatusInput,
} from '@/schemas/enrollment.schema'
import type {
  EnrollmentWithEvaluation,
  MaybeRedactedEnrollment,
} from '@/utils/enrolment/domain/enrolment.domain'
import {
  buildEnrollmentAssignments,
  deriveCanEvaluate,
  deriveEnrollmentStatus,
  deriveReviewHeading,
  isInvitationResendable,
  redactEnrollmentForTeacher,
} from '@/utils/enrolment/domain/enrolment.domain'
import {
  assignBulkGradeStatus,
  computeBulkGradePreview,
} from '@/utils/enrolment/domain/bulk-grade.domain'
import {
  bulkAssignEnrollments,
  bulkUpdateEnrollmentStatuses,
  deleteCourseSubstituteByAbsent,
  deleteEnrollmentById,
  deleteInvitationById,
  findAllTeacherIds,
  findAwaitingApprovalIdsWithSum,
  findCourseIdByTeacherId,
  findCourseIdsByTeacherIds,
  findCourseIdsForViewer,
  findCourseTeamIds,
  findEnrollmentById,
  findEnrollmentContactLookupCandidates,
  findEnrollmentEmailsByGroup,
  findEnrollmentsPage,
  findEvaluationsForEnrollments,
  findInvitationByEmail,
  findPeersForReviewers,
  findProfileById,
  findReviewerAssignmentForEnrollment,
  findReviewerAssignmentsForEnrollments,
  findUnassignedEnrollmentIds,
  insertEnrollment,
  insertInvitation,
  insertSubstituteWithReassignment,
  markEnrollmentInvitationSent,
  updateEnrollmentSpecialCaseById,
  updateEnrollmentStatusById,
  updateInvitationToken,
  upsertEvaluation,
} from '@/utils/enrolment/repository/enrolment.repository'
import { authz, resolveAdminOrTeacherAccess } from '@/utils/authz'
import {
  AppError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
import {
  buildEnrollmentContactLookupGroups,
  parseEnrollmentContactLookupNames,
} from '@/utils/enrolment/domain/email-lookup.domain'
import { env } from '@/env'
import { sendInvitationEmail } from '@/utils/email'
import {
  calculateInvitationExpiry,
  generateSecureToken,
} from '@/utils/invitation/domain/invitations.domain'

/**
 * Throws if a non-admin user is not authorized to evaluate the given enrollment.
 * Eligible callers: the assigned Reviewer, or a course team member (peer / substitute).
 * Admins bypass the check entirely.
 */
async function assertEvaluationAuthorized(
  enrollmentId: string,
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  if (isAdmin) return
  const assignment = await findReviewerAssignmentForEnrollment(enrollmentId)
  const reviewerId = assignment?.reviewerId ?? null
  const teamIds = assignment?.courseId
    ? await findCourseTeamIds(assignment.courseId)
    : reviewerId
      ? [reviewerId]
      : []
  if (reviewerId !== userId && !teamIds.includes(userId)) {
    throw new AuthorizationError('not authorized to evaluate this enrollment', {
      code: 'ACTION_NOT_ALLOWED',
      details: { enrollmentId },
    })
  }
}

function assertScoreEvaluationAuthorized(
  enrollmentId: string,
  userId: string,
  isAdmin: boolean,
  reviewerId: string | null,
  peerIds: Array<string>,
): void {
  if (isAdmin) return
  if (reviewerId === userId || peerIds.includes(userId)) return

  throw new AuthorizationError('not authorized to evaluate this enrollment', {
    code: 'ACTION_NOT_ALLOWED',
    details: { enrollmentId },
  })
}

function shouldDeriveScoreStatus(
  reviewerId: string | null,
  userId: string,
  peerIds: Array<string>,
): reviewerId is string {
  return (
    reviewerId !== null && (reviewerId === userId || peerIds.includes(userId))
  )
}

async function persistDerivedEvaluationStatus(
  enrollmentId: string,
  reviewerId: string,
  peerIds: Array<string>,
): Promise<void> {
  const [enrollment, evaluations] = await Promise.all([
    findEnrollmentById(enrollmentId),
    findEvaluationsForEnrollments([enrollmentId]),
  ])

  if (!enrollment) return

  const reviewerEval = evaluations.find((e) => e.evaluatorId === reviewerId)
  const reviewerScore = reviewerEval?.score ?? null
  const peerHasScored = evaluations.some(
    (e) => peerIds.includes(e.evaluatorId) && e.score !== null,
  )
  const nextStatus = deriveEnrollmentStatus(
    reviewerScore,
    peerHasScored,
    enrollment.status,
  )

  if (nextStatus !== null) {
    await updateEnrollmentStatusById(enrollmentId, nextStatus)
  }
}

async function setEvaluationScoreWithAccess(
  data: SetEvaluationScoreInput,
  userId: string,
): Promise<void> {
  const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
  if (!isAdmin && !isTeacher) {
    throw new AuthorizationError('admin or teacher access required', {
      code: 'ROLE_REQUIRED',
      details: {},
    })
  }

  // Fetch assignment once — reused for authz check and status derivation.
  const assignment = await findReviewerAssignmentForEnrollment(
    data.enrollmentId,
  )
  const reviewerId = assignment?.reviewerId ?? null
  const courseId = assignment?.courseId ?? null
  const teamIds = courseId
    ? await findCourseTeamIds(courseId)
    : reviewerId
      ? [reviewerId]
      : []
  const peerIds = teamIds.filter((id) => id !== reviewerId)

  assertScoreEvaluationAuthorized(
    data.enrollmentId,
    userId,
    isAdmin,
    reviewerId,
    peerIds,
  )

  await upsertEvaluation(data.enrollmentId, userId, { score: data.score })

  // Only update status when the evaluator is the assigned Reviewer or the Peer.
  if (shouldDeriveScoreStatus(reviewerId, userId, peerIds)) {
    await persistDerivedEvaluationStatus(data.enrollmentId, reviewerId, peerIds)
  }
}

/**
 * Records the caller's Enrollment Evaluation score, then auto-derives and
 * persists the enrollment status (ADR 0008 rev 1).
 *
 * - Reviewer scores → status reflects score + whether peer has already scored.
 * - Peer scores → if reviewer has a 3/4 score, status moves between
 *   `under_review` (peer absent) and `awaiting_approval` (peer present).
 * - All other evaluators → advisory only; status is unchanged.
 * - Frozen admin decisions (`approved`, `withdrawn`, `deferred`) are never
 *   overwritten.
 */
export async function setEvaluationScoreService(
  data: SetEvaluationScoreInput,
  userId: string,
) {
  return setEvaluationScoreWithAccess(data, userId)
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
  const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
  if (!isAdmin && !isTeacher) {
    throw new AuthorizationError('admin or teacher access required', {
      code: 'ROLE_REQUIRED',
      details: {},
    })
  }

  const reviewerFilter = data.viewAll ? undefined : userId
  const requireReviewerAdmitted = !isAdmin && data.viewAll

  // Course IDs the viewer is on (as teacher or active substitute).
  const viewerCourseIds =
    reviewerFilter !== undefined ? await findCourseIdsForViewer(userId) : []

  const { rows, total } = await findEnrollmentsPage({
    limit: data.pageSize,
    offset: (data.page - 1) * data.pageSize,
    search: data.search,
    sortBy: data.sortBy,
    sortDir: data.sortDir,
    includeEmail: isAdmin,
    reviewerFilter,
    viewerCourseIds,
    requireReviewerAdmitted,
  })

  const enrollmentIds = rows.map((row) => row.id)

  // Fetch evaluations and reviewer assignments in parallel.
  const [evaluations, rawAssignments] = await Promise.all([
    findEvaluationsForEnrollments(enrollmentIds),
    findReviewerAssignmentsForEnrollments(enrollmentIds),
  ])

  // Legacy rows may have courseId = null (created before ADR 0007 rev 2).
  // Enrich them by falling back to the reviewer's course in course_teachers.
  const nullReviewerIds = [
    ...new Set(
      rawAssignments
        .filter((a) => a.courseId === null)
        .map((a) => a.reviewerId),
    ),
  ]
  const fallbackCourseByReviewer =
    nullReviewerIds.length > 0
      ? await findCourseIdsByTeacherIds(nullReviewerIds)
      : new Map<string, string | null>()
  const reviewerAssignments = rawAssignments.map((a) => ({
    ...a,
    courseId: a.courseId ?? fallbackCourseByReviewer.get(a.reviewerId) ?? null,
  }))

  // Batch-fetch team members for all distinct course IDs on this page.
  const uniqueCourseIds = [
    ...new Set(
      reviewerAssignments
        .map((a) => a.courseId)
        .filter((id): id is string => id !== null),
    ),
  ]
  const peersForReviewers = await findPeersForReviewers(uniqueCourseIds)

  const enrollmentsOut: Array<EnrollmentWithEvaluation> = rows.map((row) => {
    const { evaluationSum, evaluationCount, ...enrollment } = row
    const base = isAdmin
      ? (enrollment as MaybeRedactedEnrollment)
      : redactEnrollmentForTeacher(enrollment)
    const reviewHeading = deriveReviewHeading(
      row.id,
      reviewerAssignments,
      evaluations,
      peersForReviewers,
      !isAdmin,
    )
    const assignment = reviewerAssignments.find(
      (a) => a.enrollmentId === row.id,
    )
    const reviewerEval = assignment
      ? evaluations.find(
          (e) =>
            e.enrollmentId === row.id &&
            e.evaluatorId === assignment.reviewerId,
        )
      : undefined
    const reviewerAdmissionCategory = reviewerEval?.admissionCategory ?? null
    const canEvaluate = deriveCanEvaluate(
      userId,
      isAdmin,
      assignment ?? null,
      peersForReviewers,
    )
    return {
      ...base,
      evaluationSum,
      evaluationCount,
      reviewHeading,
      reviewerAdmissionCategory,
      canEvaluate,
    }
  })

  return { enrollments: enrollmentsOut, total, evaluations }
}

export async function getEnrollmentByIdService(
  data: GetEnrollmentByIdInput,
  userId: string,
) {
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
}

export async function updateEnrollmentStatusService(
  data: UpdateEnrollmentStatusInput,
  userId: string,
) {
  await authz(userId).hasRole('admin')

  await updateEnrollmentStatusById(data.enrollmentId, data.status)

  return
}

export async function setEnrollmentSpecialCaseService(
  data: SetEnrollmentSpecialCaseInput,
  userId: string,
) {
  await authz(userId).hasRole('admin')

  await updateEnrollmentSpecialCaseById(data.enrollmentId, data.specialCase)

  return
}

export async function deleteEnrollmentService(
  data: DeleteEnrollmentInput,
  userId: string,
) {
  await authz(userId).hasRole('admin')

  await deleteEnrollmentById(data.enrollmentId)

  return
}

function buildEmailSendError(error: unknown): AppError {
  return new AppError({
    code: 'EMAIL_SEND_FAILED',
    status: 500,
    userMessage: 'Failed to send invitation email',
    internalMessage:
      error instanceof Error ? error.message : 'Email provider error',
  })
}

async function sendStudentInvitationEmail(input: {
  email: string
  senderName: string
  token: string
  lecturerTitle?: string | null
}) {
  try {
    await sendInvitationEmail({
      to: input.email,
      invitedByName: input.senderName,
      role: 'student',
      token: input.token,
      lecturerTitle: input.lecturerTitle || null,
      appUrl: env.APP_URL || 'http://localhost:3000',
    })
  } catch (error) {
    throw buildEmailSendError(error)
  }
}

function resolveEnrollmentInvitationSender(input: {
  profile: Awaited<ReturnType<typeof findProfileById>>
  userId: string
  userEmail: string | undefined
}): string {
  const senderName =
    input.profile?.fullName || input.profile?.email || input.userEmail
  if (!senderName) {
    throw new ValidationError('Email not found', {
      details: { userId: input.userId, profileId: input.profile?.id },
    })
  }
  return senderName
}

async function sendExistingEnrollmentInvitation(input: {
  enrollmentId: string
  email: string
  invitationId: string
  token: string
  expiresAt: Date
  oldToken: string
  oldExpiresAt: Date
  senderName: string
  lecturerTitle?: string | null
}) {
  await updateInvitationToken(input.invitationId, input.token, input.expiresAt)
  try {
    await sendStudentInvitationEmail(input)
  } catch (error) {
    await updateInvitationToken(
      input.invitationId,
      input.oldToken,
      input.oldExpiresAt,
    )
    throw error
  }
  await markEnrollmentInvitationSent(input.enrollmentId, input.invitationId)
  return { invitationId: input.invitationId }
}

async function sendNewEnrollmentInvitation(input: {
  enrollmentId: string
  email: string
  token: string
  expiresAt: Date
  senderName: string
  userId: string
  lecturerTitle?: string | null
}) {
  const invitation = await insertInvitation({
    email: input.email,
    role: 'student',
    token: input.token,
    expiresAt: input.expiresAt,
    status: 'pending',
    invitedBy: input.userId,
  })
  try {
    await sendStudentInvitationEmail(input)
  } catch (error) {
    await deleteInvitationById(invitation.id)
    throw error
  }
  await markEnrollmentInvitationSent(input.enrollmentId, invitation.id)
  return { invitationId: invitation.id }
}

export async function sendInvitationForEnrollmentService(
  data: SendInvitationForEnrollmentInput,
  userId: string,
  userEmail: string | undefined,
) {
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
  const expiresAt = calculateInvitationExpiry(new Date())
  const senderName = resolveEnrollmentInvitationSender({
    profile,
    userId,
    userEmail,
  })
  const lecturerTitle = profile?.lecturerTitle || null

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

    return sendExistingEnrollmentInvitation({
      enrollmentId: enrollment.id,
      email: enrollment.email,
      invitationId: existingInvitation.id,
      token,
      expiresAt,
      oldToken: existingInvitation.token,
      oldExpiresAt: existingInvitation.expiresAt,
      senderName,
      lecturerTitle,
    })
  }

  return sendNewEnrollmentInvitation({
    enrollmentId: enrollment.id,
    email: enrollment.email,
    token,
    expiresAt,
    senderName,
    userId,
    lecturerTitle,
  })
}

export async function setEvaluationAdmissionCategoryService(
  data: SetEvaluationAdmissionCategoryInput,
  userId: string,
) {
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
}

export async function setEvaluationNoteService(
  data: SetEvaluationNoteInput,
  userId: string,
) {
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
}

export async function distributeEnrollmentsService(userId: string) {
  await authz(userId).hasRole('admin')
  const [unassignedIds, teacherIds] = await Promise.all([
    findUnassignedEnrollmentIds(),
    findAllTeacherIds(),
  ])
  if (teacherIds.length === 0 || unassignedIds.length === 0) {
    return { assigned: 0 }
  }
  const assignments = buildEnrollmentAssignments(unassignedIds, teacherIds)

  // Enrich each assignment with the reviewer's course_id so the course namespace
  // is recorded on the assignment row (used for peer-review scoping, ADR 0007 rev 2).
  const uniqueReviewerIds = [...new Set(assignments.map((a) => a.reviewerId))]
  const courseByReviewer = await findCourseIdsByTeacherIds(uniqueReviewerIds)
  const enriched = assignments.map((a) => ({
    ...a,
    courseId: courseByReviewer.get(a.reviewerId) ?? null,
  }))

  try {
    await bulkAssignEnrollments(enriched)
  } catch (error) {
    throw new AppError({
      code: 'DISTRIBUTION_FAILED',
      status: 500,
      userMessage:
        'Failed to distribute enrollments. Please refresh and try again.',
      internalMessage:
        error instanceof Error ? error.message : 'bulkAssignEnrollments failed',
    })
  }
  return { assigned: assignments.length }
}

/**
 * Activates a teacher substitution: inserts a course_substitutes record and
 * bulk-reassigns all unscored assignments from the absent teacher to the
 * substitute in a single transaction.
 */
export async function substituteTeacherService(
  data: SubstituteTeacherInput,
  adminUserId: string,
): Promise<{ reassigned: number }> {
  await authz(adminUserId).hasRole('admin')

  const courseId = await findCourseIdByTeacherId(data.absentTeacherId)
  if (!courseId) {
    throw new NotFoundError('Absent teacher has no course assignment', {
      code: 'NOT_FOUND',
      details: { absentTeacherId: data.absentTeacherId },
    })
  }

  return insertSubstituteWithReassignment(
    courseId,
    data.substituteTeacherId,
    data.absentTeacherId,
  )
}

/**
 * Ends an active substitution by removing the course_substitutes record.
 * Remaining unscored assignments must be re-distributed by the admin separately.
 */
export async function endSubstitutionService(
  data: EndSubstitutionInput,
  adminUserId: string,
): Promise<void> {
  await authz(adminUserId).hasRole('admin')
  const deleted = await deleteCourseSubstituteByAbsent(data.absentTeacherId)
  if (deleted === 0) {
    throw new NotFoundError('No active substitution found for this teacher', {
      code: 'NOT_FOUND',
      details: { absentTeacherId: data.absentTeacherId },
    })
  }
}

/**
 * Returns all enrollment emails for the requested group.
 * Admin-only because it exposes enrollment contact details.
 */
export async function getEnrollmentEmailsService(
  data: GetEnrollmentEmailsInput,
  userId: string,
): Promise<{ emails: Array<string> }> {
  await authz(userId).hasRole('admin')
  const emails = await findEnrollmentEmailsByGroup(data.group)
  return { emails }
}

/**
 * Admin-only manual lookup that maps pasted applicant names to enrollment
 * contacts. Separate from status-based export cohorts.
 */
export async function searchEnrollmentContactsByNamesService(
  data: SearchEnrollmentContactsByNamesInput,
  userId: string,
) {
  await authz(userId).hasRole('admin')

  const queries = parseEnrollmentContactLookupNames(data.names)
  if (queries.length === 0) {
    throw new ValidationError('Enter at least one name')
  }

  const candidates = await findEnrollmentContactLookupCandidates(queries)
  return {
    groups: buildEnrollmentContactLookupGroups(queries, candidates),
  }
}

/**
 * Preview or execute a bulk grade operation on all `awaiting_approval`
 * enrollments. In preview mode returns counts only; in execute mode applies
 * the threshold-based status transitions and returns the same counts.
 *
 * - `dryRun: true` → count how many would be approved/waitlisted/rejected.
 * - `dryRun: false` (default) → apply statuses and return the counts written.
 */
export async function bulkGradeEnrollmentsService(
  data: BulkGradeEnrollmentsInput,
  userId: string,
): Promise<{
  approved: number
  waitlisted: number
  rejected: number
  total: number
}> {
  await authz(userId).hasRole('admin')

  const thresholds = {
    approveMin: data.approveMin,
    waitlistMin: data.waitlistMin ?? undefined,
  }

  const rows = await findAwaitingApprovalIdsWithSum()

  const specialCaseCount = rows.filter((r) => r.specialCase).length
  const regularRows = rows.filter((r) => !r.specialCase)

  const countsBySum = regularRows.reduce<Array<{ sum: number; count: number }>>(
    (acc, row) => {
      const entry = acc.find((e) => e.sum === row.sum)
      if (entry) entry.count++
      else acc.push({ sum: row.sum, count: 1 })
      return acc
    },
    [],
  )

  const preview = computeBulkGradePreview(countsBySum, thresholds)

  // Add specialCase enrollments to approved count
  const finalPreview = {
    approved: preview.approved + specialCaseCount,
    waitlisted: preview.waitlisted,
    rejected: preview.rejected,
    total: preview.total + specialCaseCount,
  }

  if (data.dryRun) return finalPreview

  const updates = rows.map((row) => ({
    id: row.id,
    status: row.specialCase
      ? 'approved'
      : (assignBulkGradeStatus(row.sum, thresholds) as
          | 'approved'
          | 'waitlisted'
          | 'rejected'),
  }))

  await bulkUpdateEnrollmentStatuses(updates)

  return finalPreview
}
