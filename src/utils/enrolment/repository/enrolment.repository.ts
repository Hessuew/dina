import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  or,
  sql,
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { ENROLLMENT_SORT_KEYS } from '@/schemas/enrollment.schema'
import { getDb } from '@/db'
import {
  enrollmentEvaluations,
  enrollmentReviewerAssignments,
  enrollments,
} from '@/db/schema'

const SORT_COLUMN_MAP = {
  fullLegalName: enrollments.fullLegalName,
  nationalityCitizenship: enrollments.nationalityCitizenship,
  yearOfBirth: enrollments.yearOfBirth,
  gender: enrollments.gender,
  status: enrollments.status,
  invitationSent: enrollments.invitationSent,
  createdAt: enrollments.createdAt,
} as const

export type EnrollmentSortKey = (typeof ENROLLMENT_SORT_KEYS)[number]

export type FindEnrollmentsPageInput = {
  limit: number
  offset: number
  search: string
  sortBy: EnrollmentSortKey
  sortDir: 'asc' | 'desc'
  includeEmail: boolean
  reviewerFilter?: string
  peerEnrollmentIds?: Array<string>
  requireReviewerAdmitted?: boolean
}

/* v8 ignore start */
function buildEnrollmentSearchFilter(search: string, includeEmail: boolean) {
  return search.trim().length > 0
    ? or(
        ilike(enrollments.fullLegalName, `%${search}%`),
        ilike(sql`${enrollments.status}::text`, `%${search}%`),
        ...(includeEmail ? [ilike(enrollments.email, `%${search}%`)] : []),
      )
    : undefined
}

// Enrollments assigned to the viewer as their reviewer.
function buildAssignedCondition(
  db: Awaited<ReturnType<typeof getDb>>,
  reviewerFilter: string | undefined,
) {
  return reviewerFilter !== undefined
    ? inArray(
        enrollments.id,
        db
          .select({ id: enrollmentReviewerAssignments.enrollmentId })
          .from(enrollmentReviewerAssignments)
          .where(eq(enrollmentReviewerAssignments.reviewerId, reviewerFilter)),
      )
    : undefined
}

// Peer-review candidate IDs are composed from table-specific adapters in the
// enrolment service before this enrollment/evaluation page query runs.
function buildPeerCondition(
  reviewerFilter: string | undefined,
  peerEnrollmentIds: Array<string>,
) {
  return reviewerFilter !== undefined && peerEnrollmentIds.length > 0
    ? inArray(enrollments.id, peerEnrollmentIds)
    : undefined
}

function buildReviewerCondition(
  db: Awaited<ReturnType<typeof getDb>>,
  reviewerFilter: string | undefined,
  peerEnrollmentIds: Array<string>,
) {
  const assigned = buildAssignedCondition(db, reviewerFilter)
  const peer = buildPeerCondition(reviewerFilter, peerEnrollmentIds)
  return assigned && peer ? or(assigned, peer) : assigned
}

function buildReviewerAdmittedCondition(
  db: Awaited<ReturnType<typeof getDb>>,
  requireReviewerAdmitted: boolean | undefined,
) {
  return requireReviewerAdmitted
    ? inArray(
        enrollments.id,
        db
          .select({ id: enrollmentReviewerAssignments.enrollmentId })
          .from(enrollmentReviewerAssignments)
          .innerJoin(
            enrollmentEvaluations,
            and(
              eq(
                enrollmentEvaluations.enrollmentId,
                enrollmentReviewerAssignments.enrollmentId,
              ),
              eq(
                enrollmentEvaluations.evaluatorId,
                enrollmentReviewerAssignments.reviewerId,
              ),
            ),
          )
          .where(inArray(enrollmentEvaluations.score, [3, 4])),
      )
    : undefined
}

function buildEnrollmentPageOrder(
  sortBy: FindEnrollmentsPageInput['sortBy'],
  sortDir: 'asc' | 'desc',
  evaluationSum: SQL<number>,
) {
  if (sortBy === 'evaluationSum') {
    return sortDir === 'asc' ? asc(evaluationSum) : desc(evaluationSum)
  }
  return sortDir === 'asc'
    ? asc(SORT_COLUMN_MAP[sortBy])
    : desc(SORT_COLUMN_MAP[sortBy])
}

export async function findEnrollmentsPage({
  limit,
  offset,
  search,
  sortBy,
  sortDir,
  includeEmail,
  reviewerFilter,
  peerEnrollmentIds = [],
  requireReviewerAdmitted,
}: FindEnrollmentsPageInput) {
  const db = await getDb()

  const whereClause = and(
    buildEnrollmentSearchFilter(search, includeEmail),
    buildReviewerCondition(db, reviewerFilter, peerEnrollmentIds),
    buildReviewerAdmittedCondition(db, requireReviewerAdmitted),
  )

  const evaluationSum = sql<number>`coalesce(sum(${enrollmentEvaluations.score}), 0)::int`
  const evaluationCount = sql<number>`count(${enrollmentEvaluations.score})::int`
  const primaryOrder = buildEnrollmentPageOrder(sortBy, sortDir, evaluationSum)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        ...getTableColumns(enrollments),
        evaluationSum,
        evaluationCount,
      })
      .from(enrollments)
      .leftJoin(
        enrollmentEvaluations,
        eq(enrollmentEvaluations.enrollmentId, enrollments.id),
      )
      .where(whereClause)
      .groupBy(enrollments.id)
      .orderBy(primaryOrder, desc(enrollments.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(enrollments).where(whereClause),
  ])

  return { rows, total }
}

/* v8 ignore end */
