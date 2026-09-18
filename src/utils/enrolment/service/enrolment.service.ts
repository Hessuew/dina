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
import type { LogLevel } from '@/utils/observability/logger'
import type {
  EnrollmentWithEvaluation,
  MaybeRedactedEnrollment,
} from '@/utils/enrolment/domain/enrolment.domain'
import type { EvaluationWithAuthor } from '@/utils/enrolment/domain/evaluation.domain'
import type {
  BulkGradeStatus,
  BulkGradeThresholds,
} from '@/utils/enrolment/domain/bulk-grade.domain'
import type { ReviewerTeamMember } from '@/utils/enrolment/domain/reviewer-teams.domain'
import { selectUnscoredReviewerEnrollmentIds } from '@/utils/enrolment/domain/substitution.domain'
import {
  assignBulkGradeStatus,
  buildBulkGradeRows,
  computeBulkGradePreview,
} from '@/utils/enrolment/domain/bulk-grade.domain'
import {
  buildEnrollmentAssignments,
  deriveCanEvaluate,
  deriveEnrollmentStatus,
  deriveReviewHeading,
  isInvitationResendable,
  redactEnrollmentForTeacher,
} from '@/utils/enrolment/domain/enrolment.domain'
import { buildReviewerTeams } from '@/utils/enrolment/domain/reviewer-teams.domain'
import { selectEnrollmentEmailsByGroup } from '@/utils/enrolment/domain/email-export.domain'
import { findEnrollmentsPage } from '@/utils/enrolment/repository/enrolment.repository'
import { getDb } from '@/db'
import {
  bulkAssignEnrollments,
  bulkUpdateEnrollmentStatuses,
  deleteCourseSubstituteByAbsent,
  deleteEnrollmentById,
  deleteInvitationById,
  findAbsentTeacherIdsWithActiveSubstitution,
  findAllTeacherIds,
  findAwaitingApprovalEnrollments,
  findCourseIdByTeacherId,
  findCourseIdsBySubstituteTeacher,
  findCourseIdsByTeacher,
  findCourseIdsByTeacherIds,
  findCourseSubstitutesByCourseIds,
  findEnrollmentById,
  findEnrollmentContactLookupCandidates,
  findEnrollmentEvaluationScoresByEnrollmentIds,
  findEnrollmentEvaluationsByEnrollmentIds,
  findEnrollmentEvaluationsByEnrollmentIdsInTransaction,
  findEnrollmentIdsExcludingDuplicates,
  findEnrollmentsForEmailExport,
  findInvitationByEmail,
  findInvitationsByIds,
  findProfileById,
  findProfilesByIds,
  findReviewerAssignmentForEnrollment,
  findReviewerAssignmentsByEnrollmentIds,
  findReviewerAssignmentsByReviewerIdInTransaction,
  findSubstituteTeacherIdsByCourse,
  findTeacherIdsByCourseId,
  findTeacherIdsByCourseIds,
  insertCourseSubstituteInTransaction,
  insertEnrollment,
  insertInvitation,
  markEnrollmentInvitationSent,
  updateEnrollmentSpecialCaseById,
  updateEnrollmentStatusById,
  updateInvitationToken,
  updateReviewerAssignmentsInTransaction,
  upsertEnrollmentEvaluation,
} from '@/utils/repository'
import {
  authz,
  hasStaffPrivilege,
  resolveAdminOrTeacherAccess,
} from '@/utils/authz'
import {
  AppError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  isAppError,
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
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

type EvaluationField = 'score' | 'admission_category' | 'note'

type EvaluationFailureCategory =
  | 'enrollment_evaluation_persistence'
  | 'enrollment_evaluation_authorization_persistence'

type EvaluationTelemetryContext = {
  field: EvaluationField
  action: string
  enrollmentId: string
  userId: string
  startedAt: number
  failureCategory: EvaluationFailureCategory
}

type EnrollmentMutationAction =
  'updateEnrollmentStatus' | 'setEnrollmentSpecialCase' | 'deleteEnrollment'

type EnrollmentAssignmentMutationAction =
  'distributeEnrollments' | 'substituteTeacher' | 'endSubstitution'

type EnrollmentAssignmentMutationContext = {
  action: EnrollmentAssignmentMutationAction
  actorId: string
  startedAt: number
}

type EnrollmentSubstitutionReadContext = {
  actorId: string
  startedAt: number
}

type EnrollmentBulkGradeContext = {
  actorId: string
  startedAt: number
}

type EnrollmentMutationContext = {
  action: EnrollmentMutationAction
  actorId: string
  enrollmentId: string
  startedAt: number
}

type EnrollmentInvitationLogContext = {
  actorId: string
  enrollmentId: string
  invitationId?: string
  invitationMode?: 'new' | 'resend'
  startedAt: number
}

type EnrollmentReadAction = 'getEnrollments' | 'getEnrollmentById'

type EnrollmentReadLogContext = {
  action: EnrollmentReadAction
  actorId: string
  enrollmentId?: string
  startedAt: number
}

type EnrollmentContactLogAction =
  'getEnrollmentEmails' | 'searchEnrollmentContactsByNames'

type EnrollmentContactLogContext = {
  actorId: string
  action: EnrollmentContactLogAction
  group?: GetEnrollmentEmailsInput['group']
  startedAt: number
}

function logEnrollmentReadEvent(
  level: LogLevel,
  event: string,
  context: EnrollmentReadLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    enrollmentId: context.enrollmentId,
    ...fields,
  })
}

function shouldLogEnrollmentReadFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

function logEnrollmentContactEvent(
  level: LogLevel,
  event: string,
  context: EnrollmentContactLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    group: context.group,
    ...fields,
  })
}

function shouldLogEnrollmentContactFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

async function findUnassignedEnrollmentIds(): Promise<Array<string>> {
  const enrollmentIds = await findEnrollmentIdsExcludingDuplicates()
  const assignments =
    await findReviewerAssignmentsByEnrollmentIds(enrollmentIds)
  const assignedIds = new Set(
    assignments.map(({ enrollmentId }) => enrollmentId),
  )
  return enrollmentIds.filter((enrollmentId) => !assignedIds.has(enrollmentId))
}

async function findCourseTeamIds(courseId: string): Promise<Array<string>> {
  const [teacherIds, substituteTeacherIds] = await Promise.all([
    findTeacherIdsByCourseId(courseId),
    findSubstituteTeacherIdsByCourse(courseId),
  ])
  return [...new Set([...teacherIds, ...substituteTeacherIds])]
}

async function findCourseIdsForViewer(userId: string): Promise<Array<string>> {
  const [teacherCourseIds, substituteCourseIds] = await Promise.all([
    findCourseIdsByTeacher(userId),
    findCourseIdsBySubstituteTeacher(userId),
  ])
  return [...new Set([...teacherCourseIds, ...substituteCourseIds])]
}

async function withEnrollmentReadTelemetry<T>(args: {
  context: EnrollmentReadLogContext
  read: () => Promise<T>
  fields: (result: T) => Record<string, unknown>
}): Promise<T> {
  try {
    const result = await args.read()
    logEnrollmentReadEvent(
      'info',
      'enrollment_read_loaded',
      args.context,
      args.fields(result),
    )
    return result
  } catch (error) {
    if (shouldLogEnrollmentReadFailure(error)) {
      logEnrollmentReadEvent('error', 'enrollment_read_failed', args.context, {
        errorCategory: 'enrollment_read_persistence',
      })
    }
    throw error
  }
}

function logEnrollmentMutation(
  level: 'info' | 'error',
  event: string,
  context: EnrollmentMutationContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    enrollmentId: context.enrollmentId,
    ...fields,
  })
}

function logEnrollmentAssignmentMutation(
  level: 'info' | 'error',
  event: string,
  context: EnrollmentAssignmentMutationContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    ...fields,
  })
}

async function withEnrollmentAssignmentReadTelemetry<T>(args: {
  context: EnrollmentAssignmentMutationContext
  errorCategory: string
  fields?: Record<string, unknown>
  read: () => Promise<T>
}): Promise<T> {
  try {
    return await args.read()
  } catch (error) {
    logEnrollmentAssignmentMutation(
      'error',
      `enrollment_${args.context.action === 'substituteTeacher' ? 'substitution' : 'distribution'}_failed`,
      args.context,
      { ...args.fields, errorCategory: args.errorCategory },
    )
    throw error
  }
}

async function requireAdminWithTelemetry(
  userId: string,
  onUnexpectedFailure: () => void,
): Promise<void> {
  try {
    await authz(userId).hasRole('admin')
  } catch (error) {
    if (shouldLogEnrollmentReadFailure(error)) onUnexpectedFailure()
    throw error
  }
}

function logEnrollmentSubstitutionReadEvent(
  level: LogLevel,
  event: string,
  context: EnrollmentSubstitutionReadContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:getActiveSubstitutedTeacherIds',
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    ...fields,
  })
}

function logEnrollmentDistributionCompleted(
  context: EnrollmentAssignmentMutationContext,
  assignedCount: number,
  unassignedCount: number,
  reviewerCount: number,
): void {
  logEnrollmentAssignmentMutation(
    'info',
    'enrollment_distribution_completed',
    context,
    { assignedCount, unassignedCount, reviewerCount },
  )
}

function logEnrollmentInvitationEvent(
  level: LogLevel,
  event: string,
  context: EnrollmentInvitationLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:sendInvitationForEnrollment',
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    enrollmentId: context.enrollmentId,
    invitationId: context.invitationId,
    invitationMode: context.invitationMode,
    ...fields,
  })
}

function logEnrollmentBulkGradeMutation(
  level: 'info' | 'error',
  event: string,
  context: EnrollmentBulkGradeContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:bulkGradeEnrollments',
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    ...fields,
  })
}

function logBulkGradeCompleted(
  context: EnrollmentBulkGradeContext,
  data: BulkGradeEnrollmentsInput,
  result: BulkGradeResult,
  awaitingApprovalCount: number,
  specialCaseCount: number,
): void {
  logEnrollmentBulkGradeMutation(
    'info',
    'enrollment_bulk_grade_completed',
    context,
    {
      approveMin: data.approveMin,
      waitlistMin: data.waitlistMin ?? null,
      dryRun: data.dryRun,
      awaitingApprovalCount,
      specialCaseCount,
      ...result,
    },
  )
}

function logEvaluationUpdated(context: EvaluationTelemetryContext): void {
  logServerEvent('info', 'enrollment_evaluation_updated', {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: 'updated',
    durationMs: elapsedMs(context.startedAt),
    enrollmentId: context.enrollmentId,
    evaluatorId: context.userId,
    evaluationField: context.field,
  })
}

function shouldLogEvaluationFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

function logEvaluationFailure(context: EvaluationTelemetryContext): void {
  logServerEvent('error', 'enrollment_evaluation_update_failed', {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: 'failure',
    durationMs: elapsedMs(context.startedAt),
    enrollmentId: context.enrollmentId,
    evaluatorId: context.userId,
    evaluationField: context.field,
    errorCategory: context.failureCategory,
  })
}

async function withEvaluationAuthorizationTelemetry<T>(
  context: EvaluationTelemetryContext,
  read: () => Promise<T>,
): Promise<T> {
  try {
    return await read()
  } catch (error) {
    if (shouldLogEvaluationFailure(error)) {
      context.failureCategory =
        'enrollment_evaluation_authorization_persistence'
    }
    throw error
  }
}

function createEvaluationTelemetryContext(
  field: EvaluationField,
  action: string,
  enrollmentId: string,
  userId: string,
  startedAt: number,
): EvaluationTelemetryContext {
  return {
    field,
    action,
    enrollmentId,
    userId,
    startedAt,
    failureCategory: 'enrollment_evaluation_persistence',
  }
}

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
    findEnrollmentEvaluationsByEnrollmentIds([enrollmentId]),
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

async function findEvaluationsForEnrollments(
  enrollmentIds: Array<string>,
): Promise<Array<EvaluationWithAuthor>> {
  const evaluations =
    await findEnrollmentEvaluationsByEnrollmentIds(enrollmentIds)
  const profiles = await findProfilesByIds(
    evaluations.map((evaluation) => evaluation.evaluatorId),
  )
  const namesByProfileId = new Map(
    profiles.map((profile) => [profile.id, profile.fullName]),
  )

  return evaluations.flatMap((evaluation) => {
    const evaluatorName = namesByProfileId.get(evaluation.evaluatorId)
    return evaluatorName === undefined ? [] : [{ ...evaluation, evaluatorName }]
  })
}

async function findReviewerAssignmentsForEnrollments(
  enrollmentIds: Array<string>,
) {
  const assignments =
    await findReviewerAssignmentsByEnrollmentIds(enrollmentIds)
  const profiles = await findProfilesByIds(
    assignments.map((assignment) => assignment.reviewerId),
  )
  const namesByProfileId = new Map(
    profiles.map((profile) => [profile.id, profile.fullName]),
  )

  return assignments.flatMap((assignment) => {
    const reviewerName = namesByProfileId.get(assignment.reviewerId)
    return reviewerName === undefined ? [] : [{ ...assignment, reviewerName }]
  })
}

type BulkGradeResult = {
  approved: number
  waitlisted: number
  rejected: number
  total: number
}

type BulkGradePlan = {
  result: BulkGradeResult
  updates: Array<{ id: string; status: BulkGradeStatus }>
  specialCaseCount: number
}

function buildBulkGradePlan(
  rows: ReadonlyArray<{ id: string; sum: number; specialCase: boolean }>,
  thresholds: BulkGradeThresholds,
): BulkGradePlan {
  const specialCaseCount = rows.filter((row) => row.specialCase).length
  const regularRows = rows.filter((row) => !row.specialCase)
  const countsBySum = regularRows.reduce<Array<{ sum: number; count: number }>>(
    (acc, row) => {
      const entry = acc.find((item) => item.sum === row.sum)
      if (entry) entry.count++
      else acc.push({ sum: row.sum, count: 1 })
      return acc
    },
    [],
  )
  const preview = computeBulkGradePreview(countsBySum, thresholds)
  const result = {
    ...preview,
    approved: preview.approved + specialCaseCount,
    total: preview.total + specialCaseCount,
  }
  const updates = rows.map((row) => ({
    id: row.id,
    status: row.specialCase
      ? ('approved' as const)
      : assignBulkGradeStatus(row.sum, thresholds),
  }))
  return { result, updates, specialCaseCount }
}

async function setEvaluationScoreWithAccess(
  data: SetEvaluationScoreInput,
  userId: string,
  context: EvaluationTelemetryContext,
): Promise<void> {
  const { isAdmin, isTeacher } = await withEvaluationAuthorizationTelemetry(
    context,
    () => resolveAdminOrTeacherAccess(userId),
  )
  if (!isAdmin && !isTeacher) {
    throw new AuthorizationError('admin or teacher access required', {
      code: 'ROLE_REQUIRED',
      details: {},
    })
  }

  // Fetch assignment once — reused for authz check and status derivation.
  const assignment = await withEvaluationAuthorizationTelemetry(context, () =>
    findReviewerAssignmentForEnrollment(data.enrollmentId),
  )
  const reviewerId = assignment?.reviewerId ?? null
  const courseId = assignment?.courseId ?? null
  const teamIds = courseId
    ? await withEvaluationAuthorizationTelemetry(context, () =>
        findCourseTeamIds(courseId),
      )
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

  await upsertEnrollmentEvaluation(data.enrollmentId, userId, {
    score: data.score,
  })

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
  const startedAt = performance.now()
  const context = createEvaluationTelemetryContext(
    'score',
    'setEvaluationScore',
    data.enrollmentId,
    userId,
    startedAt,
  )
  try {
    await setEvaluationScoreWithAccess(data, userId, context)
  } catch (error) {
    if (shouldLogEvaluationFailure(error)) {
      logEvaluationFailure(context)
    }
    throw error
  }
  logEvaluationUpdated(context)
}

export async function createEnrollmentService(data: CreateEnrollmentInput) {
  const startedAt = performance.now()
  try {
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
    logServerEvent('info', 'enrollment_created', {
      requestId: getRequestId(),
      path: 'serverFn:createEnrollment',
      status: 'success',
      durationMs: elapsedMs(startedAt),
      source: 'public_enrollment_form',
      enrollmentId: enrollment.id,
    })
    return { enrollment }
  } catch (error) {
    logServerEvent('error', 'enrollment_create_failed', {
      requestId: getRequestId(),
      path: 'serverFn:createEnrollment',
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      source: 'public_enrollment_form',
      errorCategory: 'enrollment_persistence',
    })
    throw error
  }
}

type EnrollmentsPageData = {
  rows: Awaited<ReturnType<typeof findEnrollmentsPage>>['rows']
  total: number
  evaluations: Awaited<ReturnType<typeof findEvaluationsForEnrollments>>
  reviewerAssignments: Awaited<
    ReturnType<typeof findReviewerAssignmentsForEnrollments>
  >
  peersForReviewers: Map<string, Array<ReviewerTeamMember>>
  canExportContacts: boolean
}

// Legacy rows may have courseId = null (created before ADR 0007 rev 2).
// Enrich them by falling back to the reviewer's course in course_teachers.
async function resolveAssignmentCourseIds(
  rawAssignments: EnrollmentsPageData['reviewerAssignments'],
): Promise<EnrollmentsPageData['reviewerAssignments']> {
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
  return rawAssignments.map((a) => ({
    ...a,
    courseId: a.courseId ?? fallbackCourseByReviewer.get(a.reviewerId) ?? null,
  }))
}

async function loadReviewerTeams(courseIds: Array<string>) {
  if (courseIds.length === 0)
    return new Map<string, Array<ReviewerTeamMember>>()
  const [courseTeachers, courseSubstitutes] = await Promise.all([
    findTeacherIdsByCourseIds(courseIds),
    findCourseSubstitutesByCourseIds(courseIds),
  ])
  const memberIds = [
    ...courseTeachers.map((row) => row.teacherId),
    ...courseSubstitutes.map((row) => row.substituteTeacherId),
  ]
  const profiles = await findProfilesByIds(memberIds)
  return buildReviewerTeams(courseTeachers, courseSubstitutes, profiles)
}

async function loadEnrollmentsPageData(
  data: GetEnrollmentsInput,
  userId: string,
  isAdmin: boolean,
): Promise<EnrollmentsPageData> {
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
  const [evaluations, rawAssignments, canExportContacts] = await Promise.all([
    findEvaluationsForEnrollments(enrollmentIds),
    findReviewerAssignmentsForEnrollments(enrollmentIds),
    hasStaffPrivilege(userId, 'enrollment_contact_export'),
  ])

  const reviewerAssignments = await resolveAssignmentCourseIds(rawAssignments)

  // Batch-fetch team members for all distinct course IDs on this page.
  const uniqueCourseIds = [
    ...new Set(
      reviewerAssignments
        .map((a) => a.courseId)
        .filter((id): id is string => id !== null),
    ),
  ]
  const peersForReviewers = await loadReviewerTeams(uniqueCourseIds)

  return {
    rows,
    total,
    evaluations,
    reviewerAssignments,
    peersForReviewers,
    canExportContacts,
  }
}

function toEnrollmentListItem(
  row: EnrollmentsPageData['rows'][number],
  input: {
    isAdmin: boolean
    userId: string
    reviewerAssignments: EnrollmentsPageData['reviewerAssignments']
    evaluations: EnrollmentsPageData['evaluations']
    peersForReviewers: EnrollmentsPageData['peersForReviewers']
  },
): EnrollmentWithEvaluation {
  const { evaluationSum, evaluationCount, ...enrollment } = row
  const base = input.isAdmin
    ? (enrollment as MaybeRedactedEnrollment)
    : redactEnrollmentForTeacher(enrollment)
  const reviewHeading = deriveReviewHeading(
    row.id,
    input.reviewerAssignments,
    input.evaluations,
    input.peersForReviewers,
    !input.isAdmin,
  )
  const assignment = input.reviewerAssignments.find(
    (a) => a.enrollmentId === row.id,
  )
  const reviewerEval = assignment
    ? input.evaluations.find(
        (e) =>
          e.enrollmentId === row.id && e.evaluatorId === assignment.reviewerId,
      )
    : undefined
  const reviewerAdmissionCategory = reviewerEval?.admissionCategory ?? null
  const canEvaluate = deriveCanEvaluate(
    input.userId,
    input.isAdmin,
    assignment ?? null,
    input.peersForReviewers,
  )
  return {
    ...base,
    evaluationSum,
    evaluationCount,
    reviewHeading,
    reviewerAdmissionCategory,
    canEvaluate,
  }
}

async function readEnrollmentsPage(data: GetEnrollmentsInput, userId: string) {
  const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
  if (!isAdmin && !isTeacher) {
    throw new AuthorizationError('admin or teacher access required', {
      code: 'ROLE_REQUIRED',
      details: {},
    })
  }

  const page = await loadEnrollmentsPageData(data, userId, isAdmin)
  const enrollments = page.rows.map((row) =>
    toEnrollmentListItem(row, {
      isAdmin,
      userId,
      reviewerAssignments: page.reviewerAssignments,
      evaluations: page.evaluations,
      peersForReviewers: page.peersForReviewers,
    }),
  )

  return {
    enrollments,
    total: page.total,
    evaluations: page.evaluations,
    canExportContacts: page.canExportContacts,
  }
}

export async function getEnrollmentsService(
  data: GetEnrollmentsInput,
  userId: string,
) {
  const context: EnrollmentReadLogContext = {
    action: 'getEnrollments',
    actorId: userId,
    startedAt: performance.now(),
  }

  return withEnrollmentReadTelemetry({
    context,
    read: () => readEnrollmentsPage(data, userId),
    fields: (result) => ({
      page: data.page,
      pageSize: data.pageSize,
      viewAll: data.viewAll,
      hasSearch: data.search.trim().length > 0,
      enrollmentCount: result.enrollments.length,
      total: result.total,
      evaluationCount: result.evaluations.length,
      canExportContacts: result.canExportContacts,
    }),
  })
}

export async function getEnrollmentByIdService(
  data: GetEnrollmentByIdInput,
  userId: string,
) {
  const context: EnrollmentReadLogContext = {
    action: 'getEnrollmentById',
    actorId: userId,
    enrollmentId: data.enrollmentId,
    startedAt: performance.now(),
  }

  const result = await withEnrollmentReadTelemetry({
    context,
    read: async () => {
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

      return {
        enrollment: (isAdmin
          ? enrollment
          : redactEnrollmentForTeacher(enrollment)) as MaybeRedactedEnrollment,
        view: isAdmin ? 'admin' : 'teacher',
      }
    },
    fields: (readResult) => ({
      outcome: 'found',
      view: readResult.view,
      redacted: readResult.view === 'teacher',
    }),
  })

  return { enrollment: result.enrollment }
}

export async function updateEnrollmentStatusService(
  data: UpdateEnrollmentStatusInput,
  userId: string,
) {
  const context: EnrollmentMutationContext = {
    action: 'updateEnrollmentStatus',
    actorId: userId,
    enrollmentId: data.enrollmentId,
    startedAt: performance.now(),
  }
  await requireAdminWithTelemetry(userId, () =>
    logEnrollmentMutation('error', 'enrollment_status_update_failed', context, {
      errorCategory: 'enrollment_status_authorization_persistence',
    }),
  )
  try {
    await updateEnrollmentStatusById(data.enrollmentId, data.status)
    logEnrollmentMutation('info', 'enrollment_status_updated', context, {
      enrollmentStatus: data.status,
    })
  } catch (error) {
    logEnrollmentMutation('error', 'enrollment_status_update_failed', context, {
      errorCategory: 'enrollment_status_persistence',
    })
    throw error
  }

  return
}

export async function setEnrollmentSpecialCaseService(
  data: SetEnrollmentSpecialCaseInput,
  userId: string,
) {
  const context: EnrollmentMutationContext = {
    action: 'setEnrollmentSpecialCase',
    actorId: userId,
    enrollmentId: data.enrollmentId,
    startedAt: performance.now(),
  }
  await requireAdminWithTelemetry(userId, () =>
    logEnrollmentMutation(
      'error',
      'enrollment_special_case_update_failed',
      context,
      { errorCategory: 'enrollment_special_case_authorization_persistence' },
    ),
  )
  try {
    await updateEnrollmentSpecialCaseById(data.enrollmentId, data.specialCase)
    logEnrollmentMutation('info', 'enrollment_special_case_updated', context, {
      specialCase: data.specialCase,
    })
  } catch (error) {
    logEnrollmentMutation(
      'error',
      'enrollment_special_case_update_failed',
      context,
      { errorCategory: 'enrollment_special_case_persistence' },
    )
    throw error
  }

  return
}

export async function deleteEnrollmentService(
  data: DeleteEnrollmentInput,
  userId: string,
) {
  const context: EnrollmentMutationContext = {
    action: 'deleteEnrollment',
    actorId: userId,
    enrollmentId: data.enrollmentId,
    startedAt: performance.now(),
  }
  await requireAdminWithTelemetry(userId, () =>
    logEnrollmentMutation('error', 'enrollment_delete_failed', context, {
      errorCategory: 'enrollment_delete_authorization_persistence',
    }),
  )
  try {
    await deleteEnrollmentById(data.enrollmentId)
    logEnrollmentMutation('info', 'enrollment_deleted', context)
  } catch (error) {
    logEnrollmentMutation('error', 'enrollment_delete_failed', context, {
      errorCategory: 'enrollment_delete_persistence',
    })
    throw error
  }

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
  const context: EnrollmentInvitationLogContext = {
    actorId: userId,
    enrollmentId: data.enrollmentId,
    startedAt: performance.now(),
  }
  await requireAdminWithTelemetry(userId, () =>
    logEnrollmentInvitationEvent(
      'error',
      'enrollment_invitation_failed',
      context,
      { errorCategory: 'enrollment_invitation_authorization_persistence' },
    ),
  )

  try {
    return await sendEnrollmentInvitation(data, userId, userEmail, context)
  } catch (error) {
    if (!(error instanceof AppError && error.status < 500)) {
      logEnrollmentInvitationEvent(
        'error',
        'enrollment_invitation_failed',
        context,
        {
          errorCategory:
            error instanceof AppError && error.code === 'EMAIL_SEND_FAILED'
              ? 'enrollment_invitation_email_delivery'
              : 'enrollment_invitation_persistence',
        },
      )
    }
    throw error
  }
}

async function sendEnrollmentInvitation(
  data: SendInvitationForEnrollmentInput,
  userId: string,
  userEmail: string | undefined,
  context: EnrollmentInvitationLogContext,
) {
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

  return sendEnrollmentInvitationVariant({
    enrollment,
    existingInvitation,
    token,
    expiresAt,
    senderName,
    userId,
    lecturerTitle,
    context,
  })
}

async function sendEnrollmentInvitationVariant(input: {
  enrollment: NonNullable<Awaited<ReturnType<typeof findEnrollmentById>>>
  existingInvitation: Awaited<ReturnType<typeof findInvitationByEmail>>
  token: string
  expiresAt: Date
  senderName: string
  userId: string
  lecturerTitle: string | null
  context: EnrollmentInvitationLogContext
}) {
  if (input.existingInvitation) {
    if (!isInvitationResendable(input.existingInvitation)) {
      throw new ConflictError('An invitation already exists for this email', {
        code: 'INVITATION_EXISTS',
        details: {
          email: input.enrollment.email,
          status: input.existingInvitation.status,
        },
      })
    }

    input.context.invitationMode = 'resend'
    input.context.invitationId = input.existingInvitation.id
    const result = await sendExistingEnrollmentInvitation({
      enrollmentId: input.enrollment.id,
      email: input.enrollment.email,
      invitationId: input.existingInvitation.id,
      token: input.token,
      expiresAt: input.expiresAt,
      oldToken: input.existingInvitation.token,
      oldExpiresAt: input.existingInvitation.expiresAt,
      senderName: input.senderName,
      lecturerTitle: input.lecturerTitle,
    })

    logEnrollmentInvitationEvent(
      'info',
      'enrollment_invitation_sent',
      input.context,
    )
    return result
  }

  input.context.invitationMode = 'new'
  const result = await sendNewEnrollmentInvitation({
    enrollmentId: input.enrollment.id,
    email: input.enrollment.email,
    token: input.token,
    expiresAt: input.expiresAt,
    senderName: input.senderName,
    userId: input.userId,
    lecturerTitle: input.lecturerTitle,
  })
  input.context.invitationId = result.invitationId
  logEnrollmentInvitationEvent(
    'info',
    'enrollment_invitation_sent',
    input.context,
  )
  return result
}

export async function setEvaluationAdmissionCategoryService(
  data: SetEvaluationAdmissionCategoryInput,
  userId: string,
) {
  const startedAt = performance.now()
  const context = createEvaluationTelemetryContext(
    'admission_category',
    'setEvaluationAdmissionCategory',
    data.enrollmentId,
    userId,
    startedAt,
  )
  try {
    const { isAdmin, isTeacher } = await withEvaluationAuthorizationTelemetry(
      context,
      () => resolveAdminOrTeacherAccess(userId),
    )
    if (!isAdmin && !isTeacher) {
      throw new AuthorizationError('admin or teacher access required', {
        code: 'ROLE_REQUIRED',
        details: {},
      })
    }

    await withEvaluationAuthorizationTelemetry(context, () =>
      assertEvaluationAuthorized(data.enrollmentId, userId, isAdmin),
    )

    await upsertEnrollmentEvaluation(data.enrollmentId, userId, {
      admissionCategory: data.admissionCategory,
    })
  } catch (error) {
    if (shouldLogEvaluationFailure(error)) {
      logEvaluationFailure(context)
    }
    throw error
  }

  logEvaluationUpdated(context)
}

export async function setEvaluationNoteService(
  data: SetEvaluationNoteInput,
  userId: string,
) {
  const startedAt = performance.now()
  const context = createEvaluationTelemetryContext(
    'note',
    'setEvaluationNote',
    data.enrollmentId,
    userId,
    startedAt,
  )
  try {
    const { isAdmin, isTeacher } = await withEvaluationAuthorizationTelemetry(
      context,
      () => resolveAdminOrTeacherAccess(userId),
    )
    if (!isAdmin && !isTeacher) {
      throw new AuthorizationError('admin or teacher access required', {
        code: 'ROLE_REQUIRED',
        details: {},
      })
    }

    await withEvaluationAuthorizationTelemetry(context, () =>
      assertEvaluationAuthorized(data.enrollmentId, userId, isAdmin),
    )

    await upsertEnrollmentEvaluation(data.enrollmentId, userId, {
      note: data.note,
    })
  } catch (error) {
    if (shouldLogEvaluationFailure(error)) {
      logEvaluationFailure(context)
    }
    throw error
  }

  logEvaluationUpdated(context)
}

/**
 * Reads the distribution inputs and builds course-enriched reviewer
 * assignments. Returns `null` — after logging a zero-assignment completion —
 * when there are no teachers or no unassigned enrollments.
 */
async function planEnrollmentDistribution(
  context: EnrollmentAssignmentMutationContext,
) {
  const [unassignedIds, teacherIds] =
    await withEnrollmentAssignmentReadTelemetry({
      context,
      errorCategory: 'enrollment_distribution_read_persistence',
      read: () =>
        Promise.all([findUnassignedEnrollmentIds(), findAllTeacherIds()]),
    })
  if (teacherIds.length === 0 || unassignedIds.length === 0) {
    logEnrollmentDistributionCompleted(
      context,
      0,
      unassignedIds.length,
      teacherIds.length,
    )
    return null
  }
  const assignments = buildEnrollmentAssignments(unassignedIds, teacherIds)

  // Enrich each assignment with the reviewer's course_id so the course namespace
  // is recorded on the assignment row (used for peer-review scoping, ADR 0007 rev 2).
  const uniqueReviewerIds = [...new Set(assignments.map((a) => a.reviewerId))]
  const courseByReviewer = await withEnrollmentAssignmentReadTelemetry({
    context,
    errorCategory: 'enrollment_distribution_read_persistence',
    read: () => findCourseIdsByTeacherIds(uniqueReviewerIds),
  })
  return {
    assignments: assignments.map((a) => ({
      ...a,
      courseId: courseByReviewer.get(a.reviewerId) ?? null,
    })),
    unassignedCount: unassignedIds.length,
    reviewerCount: teacherIds.length,
  }
}

export async function distributeEnrollmentsService(userId: string) {
  const context = {
    action: 'distributeEnrollments' as const,
    actorId: userId,
    startedAt: performance.now(),
  }
  await requireAdminWithTelemetry(userId, () =>
    logEnrollmentAssignmentMutation(
      'error',
      'enrollment_distribution_failed',
      context,
      { errorCategory: 'enrollment_distribution_authorization_persistence' },
    ),
  )
  const plan = await planEnrollmentDistribution(context)
  if (plan === null) return { assigned: 0 }

  try {
    await bulkAssignEnrollments(plan.assignments)
  } catch (error) {
    logEnrollmentAssignmentMutation(
      'error',
      'enrollment_distribution_failed',
      context,
      { errorCategory: 'enrollment_distribution_persistence' },
    )
    throw new AppError({
      code: 'DISTRIBUTION_FAILED',
      status: 500,
      userMessage:
        'Failed to distribute enrollments. Please refresh and try again.',
      internalMessage:
        error instanceof Error ? error.message : 'bulkAssignEnrollments failed',
    })
  }
  logEnrollmentDistributionCompleted(
    context,
    plan.assignments.length,
    plan.unassignedCount,
    plan.reviewerCount,
  )
  return { assigned: plan.assignments.length }
}

async function insertSubstitutionWithTelemetry(
  data: SubstituteTeacherInput,
  courseId: string,
  context: EnrollmentAssignmentMutationContext,
): Promise<{ reassigned: number }> {
  const fields = {
    absentTeacherId: data.absentTeacherId,
    substituteTeacherId: data.substituteTeacherId,
    courseId,
  }
  try {
    const result = await insertSubstituteWithReassignment(
      courseId,
      data.substituteTeacherId,
      data.absentTeacherId,
    )
    logEnrollmentAssignmentMutation(
      'info',
      'enrollment_substitution_completed',
      context,
      { ...fields, reassignedCount: result.reassigned },
    )
    return result
  } catch (error) {
    logEnrollmentAssignmentMutation(
      'error',
      'enrollment_substitution_failed',
      context,
      { ...fields, errorCategory: 'enrollment_substitution_persistence' },
    )
    throw error
  }
}

async function insertSubstituteWithReassignment(
  courseId: string,
  substituteTeacherId: string,
  absentTeacherId: string,
): Promise<{ reassigned: number }> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await insertCourseSubstituteInTransaction(tx, {
      courseId,
      substituteTeacherId,
      absentTeacherId,
    })
    const assignments = await findReviewerAssignmentsByReviewerIdInTransaction(
      tx,
      absentTeacherId,
    )
    const evaluations =
      await findEnrollmentEvaluationsByEnrollmentIdsInTransaction(
        tx,
        assignments.map((assignment) => assignment.enrollmentId),
      )
    const enrollmentIds = selectUnscoredReviewerEnrollmentIds(
      assignments,
      evaluations,
      absentTeacherId,
    )
    const reassigned = await updateReviewerAssignmentsInTransaction(
      tx,
      enrollmentIds,
      substituteTeacherId,
      courseId,
    )
    return { reassigned }
  })
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
  const context = {
    action: 'substituteTeacher' as const,
    actorId: adminUserId,
    startedAt: performance.now(),
  }
  await requireAdminWithTelemetry(adminUserId, () =>
    logEnrollmentAssignmentMutation(
      'error',
      'enrollment_substitution_failed',
      context,
      { errorCategory: 'enrollment_substitution_authorization_persistence' },
    ),
  )

  const courseId = await withEnrollmentAssignmentReadTelemetry({
    context,
    errorCategory: 'enrollment_substitution_read_persistence',
    fields: { absentTeacherId: data.absentTeacherId },
    read: () => findCourseIdByTeacherId(data.absentTeacherId),
  })
  if (!courseId) {
    throw new NotFoundError('Absent teacher has no course assignment', {
      code: 'NOT_FOUND',
      details: { absentTeacherId: data.absentTeacherId },
    })
  }

  return insertSubstitutionWithTelemetry(data, courseId, context)
}

/**
 * Ends an active substitution by removing the course_substitutes record.
 * Remaining unscored assignments must be re-distributed by the admin separately.
 */
export async function endSubstitutionService(
  data: EndSubstitutionInput,
  adminUserId: string,
): Promise<void> {
  const context = {
    action: 'endSubstitution' as const,
    actorId: adminUserId,
    startedAt: performance.now(),
  }
  await requireAdminWithTelemetry(adminUserId, () =>
    logEnrollmentAssignmentMutation(
      'error',
      'enrollment_substitution_end_failed',
      context,
      {
        errorCategory: 'enrollment_substitution_end_authorization_persistence',
      },
    ),
  )
  let deleted: number
  try {
    deleted = await deleteCourseSubstituteByAbsent(data.absentTeacherId)
  } catch (error) {
    logEnrollmentAssignmentMutation(
      'error',
      'enrollment_substitution_end_failed',
      context,
      {
        absentTeacherId: data.absentTeacherId,
        errorCategory: 'enrollment_substitution_end_persistence',
      },
    )
    throw error
  }
  if (deleted === 0) {
    throw new NotFoundError('No active substitution found for this teacher', {
      code: 'NOT_FOUND',
      details: { absentTeacherId: data.absentTeacherId },
    })
  }
  logEnrollmentAssignmentMutation(
    'info',
    'enrollment_substitution_ended',
    context,
    { absentTeacherId: data.absentTeacherId, removedCount: deleted },
  )
}

/**
 * Lists absent teachers with an active substitution for the Admin dialog.
 * Keep the role check in the service so direct callers cannot bypass the
 * server-function boundary.
 */
export async function getActiveSubstitutedTeacherIdsService(userId: string) {
  const context: EnrollmentSubstitutionReadContext = {
    actorId: userId,
    startedAt: performance.now(),
  }
  await requireAdminWithTelemetry(userId, () =>
    logEnrollmentSubstitutionReadEvent(
      'error',
      'enrollment_substitutions_load_failed',
      context,
      { errorCategory: 'enrollment_substitution_authorization_persistence' },
    ),
  )

  try {
    const teacherIds = await findAbsentTeacherIdsWithActiveSubstitution()
    logEnrollmentSubstitutionReadEvent(
      'info',
      'enrollment_substitutions_loaded',
      context,
      { substitutionCount: teacherIds.length },
    )
    return { teacherIds }
  } catch (error) {
    logEnrollmentSubstitutionReadEvent(
      'error',
      'enrollment_substitutions_load_failed',
      context,
      { errorCategory: 'enrollment_substitution_read_persistence' },
    )
    throw error
  }
}

async function requireEnrollmentContactExport(userId: string) {
  if (await hasStaffPrivilege(userId, 'enrollment_contact_export')) return
  throw new AuthorizationError('admin access required', {
    code: 'ROLE_REQUIRED',
  })
}

/**
 * Returns all enrollment emails for the requested group.
 * Restricted to Admins and Teacher-users with enrolment contact export.
 */
export async function getEnrollmentEmailsService(
  data: GetEnrollmentEmailsInput,
  userId: string,
): Promise<{ emails: Array<string> }> {
  const context: EnrollmentContactLogContext = {
    actorId: userId,
    action: 'getEnrollmentEmails',
    group: data.group,
    startedAt: performance.now(),
  }

  try {
    await requireEnrollmentContactExport(userId)
  } catch (error) {
    if (shouldLogEnrollmentContactFailure(error)) {
      logEnrollmentContactEvent(
        'error',
        'enrollment_contact_export_failed',
        context,
        { errorCategory: 'enrollment_contact_access_persistence' },
      )
    }
    throw error
  }

  try {
    const enrollments = await findEnrollmentsForEmailExport()
    const invitations =
      data.group === 'all' || data.group === 'approved'
        ? []
        : await findInvitationsByIds(
            enrollments.flatMap((enrollment) =>
              enrollment.invitationId ? [enrollment.invitationId] : [],
            ),
          )
    const emails = selectEnrollmentEmailsByGroup({
      group: data.group,
      enrollments,
      invitations,
    })
    logEnrollmentContactEvent('info', 'enrollment_contact_exported', context, {
      contactCount: emails.length,
    })
    return { emails }
  } catch (error) {
    logEnrollmentContactEvent(
      'error',
      'enrollment_contact_export_failed',
      context,
      { errorCategory: 'enrollment_contact_export_persistence' },
    )
    throw error
  }
}

/**
 * Admin-only manual lookup that maps pasted applicant names to enrollment
 * contacts. Separate from status-based export cohorts.
 */
export async function searchEnrollmentContactsByNamesService(
  data: SearchEnrollmentContactsByNamesInput,
  userId: string,
) {
  const context: EnrollmentContactLogContext = {
    actorId: userId,
    action: 'searchEnrollmentContactsByNames',
    startedAt: performance.now(),
  }

  try {
    await requireEnrollmentContactExport(userId)
  } catch (error) {
    if (shouldLogEnrollmentContactFailure(error)) {
      logEnrollmentContactEvent(
        'error',
        'enrollment_contact_lookup_failed',
        context,
        { errorCategory: 'enrollment_contact_access_persistence' },
      )
    }
    throw error
  }

  const queries = parseEnrollmentContactLookupNames(data.names)
  if (queries.length === 0) {
    throw new ValidationError('Enter at least one name')
  }
  try {
    const candidates = await findEnrollmentContactLookupCandidates(queries)
    const groups = buildEnrollmentContactLookupGroups(queries, candidates)
    logEnrollmentContactEvent(
      'info',
      'enrollment_contact_lookup_completed',
      context,
      {
        queryCount: queries.length,
        candidateCount: candidates.length,
        groupCount: groups.length,
        matchedContactCount: groups.reduce(
          (count, group) => count + group.matches.length,
          0,
        ),
        suggestionCount: groups.reduce(
          (count, group) => count + group.suggestions.length,
          0,
        ),
      },
    )
    return { groups }
  } catch (error) {
    logEnrollmentContactEvent(
      'error',
      'enrollment_contact_lookup_failed',
      context,
      { errorCategory: 'enrollment_contact_lookup_persistence' },
    )
    throw error
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
async function findAwaitingApprovalRowsWithTelemetry(
  context: EnrollmentBulkGradeContext,
) {
  try {
    const enrollments = await findAwaitingApprovalEnrollments()
    const evaluations = await findEnrollmentEvaluationScoresByEnrollmentIds(
      enrollments.map((enrollment) => enrollment.id),
    )
    return buildBulkGradeRows(enrollments, evaluations)
  } catch (error) {
    logEnrollmentBulkGradeMutation(
      'error',
      'enrollment_bulk_grade_failed',
      context,
      { errorCategory: 'enrollment_bulk_grade_read_persistence' },
    )
    throw error
  }
}

export async function bulkGradeEnrollmentsService(
  data: BulkGradeEnrollmentsInput,
  userId: string,
): Promise<BulkGradeResult> {
  const context: EnrollmentBulkGradeContext = {
    actorId: userId,
    startedAt: performance.now(),
  }
  await requireAdminWithTelemetry(userId, () =>
    logEnrollmentBulkGradeMutation(
      'error',
      'enrollment_bulk_grade_failed',
      context,
      { errorCategory: 'enrollment_bulk_grade_authorization_persistence' },
    ),
  )
  const thresholds = {
    approveMin: data.approveMin,
    waitlistMin: data.waitlistMin ?? undefined,
  }

  const rows = await findAwaitingApprovalRowsWithTelemetry(context)
  const plan = buildBulkGradePlan(rows, thresholds)

  if (data.dryRun) {
    logBulkGradeCompleted(
      context,
      data,
      plan.result,
      rows.length,
      plan.specialCaseCount,
    )
    return plan.result
  }

  try {
    await bulkUpdateEnrollmentStatuses(plan.updates)
  } catch (error) {
    logEnrollmentBulkGradeMutation(
      'error',
      'enrollment_bulk_grade_failed',
      context,
      {
        errorCategory: 'enrollment_bulk_grade_update_persistence',
        awaitingApprovalCount: rows.length,
      },
    )
    throw error
  }

  logBulkGradeCompleted(
    context,
    data,
    plan.result,
    rows.length,
    plan.specialCaseCount,
  )
  return plan.result
}
