import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  inArray,
  isNull,
  ne,
  notLike,
  or,
  sql,
} from 'drizzle-orm'
import type { ENROLLMENT_SORT_KEYS } from '@/schemas/enrollment.schema'
import { getDb } from '@/db'
import {
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
  peerIds?: Array<string>
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
  peerIds = [],
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

  // Enrollments the viewer's course partner scored 3 or 4 (peer-review queue).
  const peerCondition =
    reviewerFilter !== undefined && peerIds.length > 0
      ? inArray(
          enrollments.id,
          db
            .select({ id: enrollmentEvaluations.enrollmentId })
            .from(enrollmentEvaluations)
            .where(
              and(
                inArray(enrollmentEvaluations.evaluatorId, peerIds),
                inArray(enrollmentEvaluations.score, [3, 4]),
              ),
            ),
        )
      : undefined

  const reviewerCondition =
    assignedCondition && peerCondition
      ? or(assignedCondition, peerCondition)
      : assignedCondition

  const whereClause = and(searchFilter, reviewerCondition)

  const evaluationSum = sql<number>`coalesce(sum(${enrollmentEvaluations.score}), 0)::int`
  const evaluationCount = sql<number>`count(${enrollmentEvaluations.id})::int`

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

export async function findPeerTeacherIds(
  userId: string,
): Promise<Array<string>> {
  const db = await getDb()
  const rows = await db
    .selectDistinct({ id: courseTeachers.teacherId })
    .from(courseTeachers)
    .where(
      and(
        inArray(
          courseTeachers.courseId,
          db
            .select({ courseId: courseTeachers.courseId })
            .from(courseTeachers)
            .where(eq(courseTeachers.teacherId, userId)),
        ),
        ne(courseTeachers.teacherId, userId),
      ),
    )
  return rows.map((r) => r.id)
}

export async function bulkAssignEnrollments(
  assignments: Array<{ enrollmentId: string; reviewerId: string }>,
): Promise<void> {
  if (assignments.length === 0) return
  const db = await getDb()
  await db
    .insert(enrollmentReviewerAssignments)
    .values(assignments)
    .onConflictDoNothing()
}
/* v8 ignore end */
