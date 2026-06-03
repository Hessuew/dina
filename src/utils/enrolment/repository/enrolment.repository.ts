import {
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
import type { ENROLLMENT_SORT_KEYS } from '@/schemas/enrollment.schema'
import { getDb } from '@/db'
import {
  enrollmentEvaluations,
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
  note: string | null
}

export type FindEnrollmentsPageInput = {
  limit: number
  offset: number
  search: string
  sortBy: EnrollmentSortKey
  sortDir: 'asc' | 'desc'
  includeEmail: boolean
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
}: FindEnrollmentsPageInput) {
  const db = await getDb()

  const searchFilter =
    search.trim().length > 0
      ? or(
          ilike(enrollments.fullLegalName, `%${search}%`),
          ilike(enrollments.status, `%${search}%`),
          ...(includeEmail ? [ilike(enrollments.email, `%${search}%`)] : []),
        )
      : undefined

  const whereClause = searchFilter

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
  patch: { score?: number | null; note?: string },
) {
  const db = await getDb()
  await db
    .insert(enrollmentEvaluations)
    .values({
      enrollmentId,
      evaluatorId,
      score: patch.score ?? null,
      note: patch.note ?? null,
    })
    .onConflictDoUpdate({
      target: [
        enrollmentEvaluations.enrollmentId,
        enrollmentEvaluations.evaluatorId,
      ],
      set: {
        ...(patch.score !== undefined ? { score: patch.score } : {}),
        ...(patch.note !== undefined ? { note: patch.note } : {}),
        updatedAt: new Date(),
      },
    })
}

export async function updateEnrollmentStatusById(
  enrollmentId: string,
  status: typeof enrollments.$inferSelect['status'],
) {
  const db = await getDb()
  await db
    .update(enrollments)
    .set({ status, updatedAt: new Date() })
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
/* v8 ignore end */
