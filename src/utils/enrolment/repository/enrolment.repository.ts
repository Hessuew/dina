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
import { enrollmentEvaluations, enrollments } from '@/db/schema'

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
  reviewerEnrollmentIds?: Array<string>
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

// Assigned and peer-review enrollment IDs are composed from table-specific
// adapters in the enrolment service before this enrollment/evaluation page
// query runs. An empty list intentionally matches no rows for a reviewer view.
function buildReviewerCondition(
  reviewerEnrollmentIds: Array<string> | undefined,
) {
  return reviewerEnrollmentIds === undefined
    ? undefined
    : inArray(enrollments.id, reviewerEnrollmentIds)
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
  reviewerEnrollmentIds,
}: FindEnrollmentsPageInput) {
  const db = await getDb()

  const whereClause = and(
    buildEnrollmentSearchFilter(search, includeEmail),
    buildReviewerCondition(reviewerEnrollmentIds),
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
