import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  notLike,
  or,
  sql,
} from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import type { ENROLLMENT_SORT_KEYS } from '@/schemas/enrollment.schema'
import { getDb } from '@/db'
import {
  findCourseIdsBySubstituteTeacher,
  findCourseIdsByTeacher,
  findSubstituteTeacherIdsByCourse,
  findTeacherIdsByCourseId,
  insertCourseSubstituteInTransaction,
  updateReviewerAssignmentsInTransaction,
} from '@/utils/repository'
import {
  courseSubstitutes,
  courseTeachers,
  enrollmentEvaluations,
  enrollmentReviewerAssignments,
  enrollments,
  profiles,
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
  viewerCourseIds?: Array<string>
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

// Peer-review queue: enrollments on the viewer's course team where a
// different reviewer (team member) has scored 3 or 4.
// Scoped through enrollment_reviewer_assignments.course_id (ADR 0007 rev 2).
// Legacy rows with course_id = NULL fall back to a LEFT JOIN on courseTeachers.
function buildPeerCondition(
  db: Awaited<ReturnType<typeof getDb>>,
  reviewerFilter: string | undefined,
  viewerCourseIds: Array<string>,
) {
  return reviewerFilter !== undefined && viewerCourseIds.length > 0
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
          .leftJoin(
            courseTeachers,
            and(
              isNull(enrollmentReviewerAssignments.courseId),
              eq(
                courseTeachers.teacherId,
                enrollmentReviewerAssignments.reviewerId,
              ),
            ),
          )
          .where(
            and(
              or(
                and(
                  isNotNull(enrollmentReviewerAssignments.courseId),
                  inArray(
                    enrollmentReviewerAssignments.courseId,
                    viewerCourseIds,
                  ),
                ),
                and(
                  isNull(enrollmentReviewerAssignments.courseId),
                  isNotNull(courseTeachers.courseId),
                  inArray(courseTeachers.courseId, viewerCourseIds),
                ),
              ),
              ne(enrollmentReviewerAssignments.reviewerId, reviewerFilter),
              inArray(enrollmentEvaluations.score, [3, 4]),
            ),
          ),
      )
    : undefined
}

function buildReviewerCondition(
  db: Awaited<ReturnType<typeof getDb>>,
  reviewerFilter: string | undefined,
  viewerCourseIds: Array<string>,
) {
  const assigned = buildAssignedCondition(db, reviewerFilter)
  const peer = buildPeerCondition(db, reviewerFilter, viewerCourseIds)
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
  viewerCourseIds = [],
  requireReviewerAdmitted,
}: FindEnrollmentsPageInput) {
  const db = await getDb()

  const whereClause = and(
    buildEnrollmentSearchFilter(search, includeEmail),
    buildReviewerCondition(db, reviewerFilter, viewerCourseIds),
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

/**
 * Fetches reviewer assignments with reviewer names and course namespace for a
 * batch of enrollments in a single query (used to build the Review heading column).
 */
export async function findReviewerAssignmentsForEnrollments(
  enrollmentIds: Array<string>,
): Promise<
  Array<{
    enrollmentId: string
    reviewerId: string
    reviewerName: string
    courseId: string | null
  }>
> {
  if (enrollmentIds.length === 0) return []
  const db = await getDb()
  const rows = await db
    .select({
      enrollmentId: enrollmentReviewerAssignments.enrollmentId,
      reviewerId: enrollmentReviewerAssignments.reviewerId,
      reviewerName: profiles.fullName,
      courseId: enrollmentReviewerAssignments.courseId,
    })
    .from(enrollmentReviewerAssignments)
    .innerJoin(
      profiles,
      eq(profiles.id, enrollmentReviewerAssignments.reviewerId),
    )
    .where(inArray(enrollmentReviewerAssignments.enrollmentId, enrollmentIds))
  return rows.map((r) => ({ ...r, courseId: r.courseId ?? null }))
}

/**
 * Returns all course member IDs (regular teachers + active substitutes) for a
 * given course. Used for peer-review authz and status derivation.
 */
export async function findCourseTeamIds(
  courseId: string,
): Promise<Array<string>> {
  const [teacherIds, substituteTeacherIds] = await Promise.all([
    findTeacherIdsByCourseId(courseId),
    findSubstituteTeacherIdsByCourse(courseId),
  ])
  return [...new Set([...teacherIds, ...substituteTeacherIds])]
}

/**
 * Returns all course IDs the viewer is active on — either as a regular teacher
 * or as an active substitute. Used to build viewerCourseIds for page filtering.
 */
export async function findCourseIdsForViewer(
  userId: string,
): Promise<Array<string>> {
  const [teacherCourseIds, substituteCourseIds] = await Promise.all([
    findCourseIdsByTeacher(userId),
    findCourseIdsBySubstituteTeacher(userId),
  ])
  return [...new Set([...teacherCourseIds, ...substituteCourseIds])]
}

/**
 * Fetches all course team members (teachers + substitutes) for a batch of
 * course IDs and returns a map from course ID to member list. Absent teachers
 * with an active substitution are excluded — their substitute stands in for
 * them — so the Review heading peer never resolves to an absent teacher.
 */
export async function findPeersForReviewers(
  courseIds: Array<string>,
): Promise<Map<string, Array<{ id: string; name: string }>>> {
  const result = new Map<string, Array<{ id: string; name: string }>>()
  if (courseIds.length === 0) return result

  const db = await getDb()

  const [teacherRows, substituteRows] = await Promise.all([
    db
      .select({
        courseId: courseTeachers.courseId,
        id: courseTeachers.teacherId,
        name: profiles.fullName,
      })
      .from(courseTeachers)
      .innerJoin(profiles, eq(profiles.id, courseTeachers.teacherId))
      .where(inArray(courseTeachers.courseId, courseIds)),
    db
      .select({
        courseId: courseSubstitutes.courseId,
        id: courseSubstitutes.substituteTeacherId,
        absentTeacherId: courseSubstitutes.absentTeacherId,
        name: profiles.fullName,
      })
      .from(courseSubstitutes)
      .innerJoin(
        profiles,
        eq(profiles.id, courseSubstitutes.substituteTeacherId),
      )
      .where(inArray(courseSubstitutes.courseId, courseIds)),
  ])

  // Absent teachers (per course) are on leave: drop them from the team so the
  // substitute represents them in peer resolution.
  const absentByCourse = new Map<string, Set<string>>()
  for (const row of substituteRows) {
    const absent = absentByCourse.get(row.courseId) ?? new Set<string>()
    absent.add(row.absentTeacherId)
    absentByCourse.set(row.courseId, absent)
  }

  for (const row of [...teacherRows, ...substituteRows]) {
    if (absentByCourse.get(row.courseId)?.has(row.id)) continue
    const members = result.get(row.courseId) ?? []
    if (!members.some((m) => m.id === row.id)) {
      members.push({ id: row.id, name: row.name })
    }
    result.set(row.courseId, members)
  }

  return result
}

export async function findUnassignedEnrollmentIds(): Promise<Array<string>> {
  const db = await getDb()

  const rows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .leftJoin(
      enrollmentReviewerAssignments,
      eq(enrollmentReviewerAssignments.enrollmentId, enrollments.id),
    )
    .where(
      and(
        isNull(enrollmentReviewerAssignments.id),
        notLike(enrollments.email, 'duplicate_%'),
      ),
    )
    .orderBy(asc(enrollments.createdAt))

  return rows.map((r) => r.id)
}

/**
 * Transactionally inserts a course_substitutes record and bulk-reassigns all
 * unscored assignments from the absent teacher to the substitute.
 * Returns the count of reassigned assignments.
 */
export async function insertSubstituteWithReassignment(
  courseId: string,
  substituteTeacherId: string,
  absentTeacherId: string,
): Promise<{ reassigned: number }> {
  const db = await getDb()
  let reassigned = 0
  await db.transaction(async (tx) => {
    await insertCourseSubstituteInTransaction(tx, {
      courseId,
      substituteTeacherId,
      absentTeacherId,
    })

    const rows = await tx
      .select({ enrollmentId: enrollmentReviewerAssignments.enrollmentId })
      .from(enrollmentReviewerAssignments)
      .leftJoin(
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
      .where(
        and(
          eq(enrollmentReviewerAssignments.reviewerId, absentTeacherId),
          isNull(enrollmentEvaluations.score),
        ),
      )

    if (rows.length > 0) {
      reassigned = await updateReviewerAssignmentsInTransaction(
        tx,
        rows.map((r) => r.enrollmentId),
        substituteTeacherId,
        courseId,
      )
    }
  })
  return { reassigned }
}

/**
 * Returns the evaluation sum (score total across all evaluators) and specialCase flag
 * for every `awaiting_approval` enrollment. Used by the bulk-grade feature to preview
 * and execute score-threshold-based status decisions. SpecialCase enrollments are
 * auto-approved regardless of score.
 */
export async function findAwaitingApprovalIdsWithSum(): Promise<
  Array<{ id: string; sum: number; specialCase: boolean }>
> {
  const db = await getDb()
  const evalSum = sql<number>`coalesce(sum(${enrollmentEvaluations.score}), 0)::int`
  const rows = await db
    .select({
      id: enrollments.id,
      sum: evalSum,
      specialCase: enrollments.specialCase,
    })
    .from(enrollments)
    .leftJoin(
      enrollmentEvaluations,
      eq(enrollmentEvaluations.enrollmentId, enrollments.id),
    )
    .where(eq(enrollments.status, 'awaiting_approval'))
    .groupBy(enrollments.id)
  return rows
}

/* v8 ignore end */
