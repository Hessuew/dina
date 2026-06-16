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
import type { ENROLLMENT_SORT_KEYS } from '@/schemas/enrollment.schema'
import { getDb } from '@/db'
import {
  courseSubstitutes,
  courseTeachers,
  enrollmentEvaluations,
  enrollmentReviewerAssignments,
  enrollments,
  invitations,
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

export type EvaluationWithAuthor = {
  enrollmentId: string
  evaluatorId: string
  evaluatorName: string
  score: number | null
  admissionCategory: (typeof enrollmentEvaluations.$inferSelect)['admissionCategory']
  note: string | null
}

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
export async function insertEnrollment(
  data: Omit<typeof enrollments.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const db = await getDb()
  const [enrollment] = await db.insert(enrollments).values(data).returning()
  return enrollment
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

  const searchFilter =
    search.trim().length > 0
      ? or(
          ilike(enrollments.fullLegalName, `%${search}%`),
          ilike(sql`${enrollments.status}::text`, `%${search}%`),
          ...(includeEmail ? [ilike(enrollments.email, `%${search}%`)] : []),
        )
      : undefined

  // Enrollments assigned to the viewer as their reviewer.
  const assignedCondition =
    reviewerFilter !== undefined
      ? inArray(
          enrollments.id,
          db
            .select({ id: enrollmentReviewerAssignments.enrollmentId })
            .from(enrollmentReviewerAssignments)
            .where(
              eq(enrollmentReviewerAssignments.reviewerId, reviewerFilter),
            ),
        )
      : undefined

  // Peer-review queue: enrollments on the viewer's course team where a
  // different reviewer (team member) has scored 3 or 4.
  // Scoped through enrollment_reviewer_assignments.course_id (ADR 0007 rev 2).
  // Legacy rows with course_id = NULL fall back to a LEFT JOIN on courseTeachers.
  const peerCondition =
    reviewerFilter !== undefined && viewerCourseIds.length > 0
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

  const reviewerCondition =
    assignedCondition && peerCondition
      ? or(assignedCondition, peerCondition)
      : assignedCondition

  const reviewerAdmittedCondition = requireReviewerAdmitted
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

  const whereClause = and(
    searchFilter,
    reviewerCondition,
    reviewerAdmittedCondition,
  )

  const evaluationSum = sql<number>`coalesce(sum(${enrollmentEvaluations.score}), 0)::int`
  const evaluationCount = sql<number>`count(${enrollmentEvaluations.score})::int`

  const primaryOrder =
    sortBy === 'evaluationSum'
      ? sortDir === 'asc'
        ? asc(evaluationSum)
        : desc(evaluationSum)
      : sortDir === 'asc'
        ? asc(SORT_COLUMN_MAP[sortBy])
        : desc(SORT_COLUMN_MAP[sortBy])

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

export async function findEnrollmentById(enrollmentId: string) {
  const db = await getDb()
  return db.query.enrollments.findFirst({
    where: eq(enrollments.id, enrollmentId),
  })
}

export async function findEvaluationsForEnrollments(
  enrollmentIds: Array<string>,
): Promise<Array<EvaluationWithAuthor>> {
  if (enrollmentIds.length === 0) return []
  const db = await getDb()
  return db
    .select({
      enrollmentId: enrollmentEvaluations.enrollmentId,
      evaluatorId: enrollmentEvaluations.evaluatorId,
      evaluatorName: profiles.fullName,
      score: enrollmentEvaluations.score,
      admissionCategory: enrollmentEvaluations.admissionCategory,
      note: enrollmentEvaluations.note,
    })
    .from(enrollmentEvaluations)
    .innerJoin(profiles, eq(profiles.id, enrollmentEvaluations.evaluatorId))
    .where(inArray(enrollmentEvaluations.enrollmentId, enrollmentIds))
    .orderBy(asc(enrollmentEvaluations.createdAt))
}

export async function upsertEvaluation(
  enrollmentId: string,
  evaluatorId: string,
  patch: {
    score?: number | null
    admissionCategory?: (typeof enrollmentEvaluations.$inferSelect)['admissionCategory']
    note?: string
  },
) {
  const db = await getDb()
  await db
    .insert(enrollmentEvaluations)
    .values({
      enrollmentId,
      evaluatorId,
      score: patch.score ?? null,
      admissionCategory: patch.admissionCategory ?? null,
      note: patch.note ?? null,
    })
    .onConflictDoUpdate({
      target: [
        enrollmentEvaluations.enrollmentId,
        enrollmentEvaluations.evaluatorId,
      ],
      set: {
        ...(patch.score !== undefined
          ? {
              score: patch.score,
              ...(!patch.score || patch.score < 3
                ? { admissionCategory: null }
                : {}),
            }
          : {}),
        ...(patch.admissionCategory !== undefined
          ? { admissionCategory: patch.admissionCategory }
          : {}),
        ...(patch.note !== undefined ? { note: patch.note } : {}),
        updatedAt: new Date(),
      },
    })
}

export async function updateEnrollmentStatusById(
  enrollmentId: string,
  status: (typeof enrollments.$inferSelect)['status'],
) {
  const db = await getDb()
  await db
    .update(enrollments)
    .set({ status, updatedAt: new Date() })
    .where(eq(enrollments.id, enrollmentId))
}

export async function updateEnrollmentSpecialCaseById(
  enrollmentId: string,
  specialCase: boolean,
) {
  const db = await getDb()
  await db
    .update(enrollments)
    .set({ specialCase, updatedAt: new Date() })
    .where(eq(enrollments.id, enrollmentId))
}

export async function deleteEnrollmentById(enrollmentId: string) {
  const db = await getDb()
  await db.delete(enrollments).where(eq(enrollments.id, enrollmentId))
}

/**
 * Returns the reviewer ID and course namespace for a single enrollment's
 * assignment. Used by authz helpers that need course-scoped peer resolution.
 */
export async function findReviewerAssignmentForEnrollment(
  enrollmentId: string,
): Promise<{ reviewerId: string; courseId: string | null } | null> {
  const db = await getDb()
  const row = await db.query.enrollmentReviewerAssignments.findFirst({
    where: eq(enrollmentReviewerAssignments.enrollmentId, enrollmentId),
    columns: { reviewerId: true, courseId: true },
  })
  return row
    ? { reviewerId: row.reviewerId, courseId: row.courseId ?? null }
    : null
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
  const db = await getDb()
  const [teacherRows, substituteRows] = await Promise.all([
    db
      .select({ id: courseTeachers.teacherId })
      .from(courseTeachers)
      .where(eq(courseTeachers.courseId, courseId)),
    db
      .select({ id: courseSubstitutes.substituteTeacherId })
      .from(courseSubstitutes)
      .where(eq(courseSubstitutes.courseId, courseId)),
  ])
  return [
    ...new Set([
      ...teacherRows.map((r) => r.id),
      ...substituteRows.map((r) => r.id),
    ]),
  ]
}

/**
 * Returns all course IDs the viewer is active on — either as a regular teacher
 * or as an active substitute. Used to build viewerCourseIds for page filtering.
 */
export async function findCourseIdsForViewer(
  userId: string,
): Promise<Array<string>> {
  const db = await getDb()
  const [teacherRows, substituteRows] = await Promise.all([
    db
      .select({ courseId: courseTeachers.courseId })
      .from(courseTeachers)
      .where(eq(courseTeachers.teacherId, userId)),
    db
      .select({ courseId: courseSubstitutes.courseId })
      .from(courseSubstitutes)
      .where(eq(courseSubstitutes.substituteTeacherId, userId)),
  ])
  return [
    ...new Set([
      ...teacherRows.map((r) => r.courseId),
      ...substituteRows.map((r) => r.courseId),
    ]),
  ]
}

/**
 * Fetches all course team members (teachers + substitutes) for a batch of
 * course IDs in two queries and returns a map from course ID to member list.
 * Used to build the Review heading column.
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
        name: profiles.fullName,
      })
      .from(courseSubstitutes)
      .innerJoin(
        profiles,
        eq(profiles.id, courseSubstitutes.substituteTeacherId),
      )
      .where(inArray(courseSubstitutes.courseId, courseIds)),
  ])

  for (const row of [...teacherRows, ...substituteRows]) {
    const members = result.get(row.courseId) ?? []
    if (!members.some((m) => m.id === row.id)) {
      members.push({ id: row.id, name: row.name })
    }
    result.set(row.courseId, members)
  }

  return result
}

export async function findProfileById(userId: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })
}

export async function findInvitationByEmail(email: string) {
  const db = await getDb()
  return db.query.invitations.findFirst({
    where: eq(invitations.email, email),
  })
}

export async function updateInvitationToken(
  invitationId: string,
  token: string,
  expiresAt: Date,
) {
  const db = await getDb()
  await db
    .update(invitations)
    .set({ token, expiresAt, updatedAt: new Date() })
    .where(eq(invitations.id, invitationId))
}

export async function insertInvitation(
  data: Omit<typeof invitations.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const db = await getDb()
  const [invitation] = await db.insert(invitations).values(data).returning()
  return invitation
}

export async function deleteInvitationById(invitationId: string) {
  const db = await getDb()
  await db.delete(invitations).where(eq(invitations.id, invitationId))
}

export async function markEnrollmentInvitationSent(
  enrollmentId: string,
  invitationId: string,
) {
  const db = await getDb()
  await db
    .update(enrollments)
    .set({ invitationSent: true, invitationId, updatedAt: new Date() })
    .where(eq(enrollments.id, enrollmentId))
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

export async function findAllTeacherIds(): Promise<Array<string>> {
  const db = await getDb()
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(inArray(profiles.role, ['teacher', 'admin']))
    .orderBy(asc(profiles.createdAt))
  return rows.map((r) => r.id)
}

/**
 * Returns the course_id for a teacher from course_teachers. Used when
 * enriching bulk assignments and initiating substitutions.
 */
export async function findCourseIdByTeacherId(
  teacherId: string,
): Promise<string | null> {
  const db = await getDb()
  const row = await db.query.courseTeachers.findFirst({
    where: eq(courseTeachers.teacherId, teacherId),
    columns: { courseId: true },
  })
  return row?.courseId ?? null
}

/**
 * Fetches course IDs for a batch of teacher IDs in one query.
 * Returns a Map from teacherId → courseId (null if not found).
 */
export async function findCourseIdsByTeacherIds(
  teacherIds: Array<string>,
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>(
    teacherIds.map((id) => [id, null]),
  )
  if (teacherIds.length === 0) return result
  const db = await getDb()
  const rows = await db
    .select({
      teacherId: courseTeachers.teacherId,
      courseId: courseTeachers.courseId,
    })
    .from(courseTeachers)
    .where(inArray(courseTeachers.teacherId, teacherIds))
  for (const row of rows) result.set(row.teacherId, row.courseId)
  return result
}

export async function bulkAssignEnrollments(
  assignments: Array<{
    enrollmentId: string
    reviewerId: string
    courseId?: string | null
  }>,
): Promise<void> {
  if (assignments.length === 0) return
  const db = await getDb()
  await db
    .insert(enrollmentReviewerAssignments)
    .values(assignments)
    .onConflictDoNothing()
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
    await tx
      .insert(courseSubstitutes)
      .values({ courseId, substituteTeacherId, absentTeacherId })

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
      await tx
        .update(enrollmentReviewerAssignments)
        .set({ reviewerId: substituteTeacherId, courseId })
        .where(
          inArray(
            enrollmentReviewerAssignments.enrollmentId,
            rows.map((r) => r.enrollmentId),
          ),
        )
      reassigned = rows.length
    }
  })
  return { reassigned }
}

/**
 * Returns the distinct absent teacher IDs that currently have an active
 * substitution in course_substitutes. Used to filter the End-Substitution
 * dialog to only teachers who can actually have a substitution ended.
 */
export async function findAbsentTeacherIdsWithActiveSubstitution(): Promise<
  Array<string>
> {
  const db = await getDb()
  const rows = await db
    .select({ absentTeacherId: courseSubstitutes.absentTeacherId })
    .from(courseSubstitutes)
  return [...new Set(rows.map((r) => r.absentTeacherId))]
}

/**
 * Removes the active course_substitutes record for the given absent teacher.
 * Returns the number of deleted rows so the caller can detect a missing record.
 */
export async function deleteCourseSubstituteByAbsent(
  absentTeacherId: string,
): Promise<number> {
  const db = await getDb()
  const deleted = await db
    .delete(courseSubstitutes)
    .where(eq(courseSubstitutes.absentTeacherId, absentTeacherId))
    .returning({ id: courseSubstitutes.id })
  return deleted.length
}
/* v8 ignore end */
