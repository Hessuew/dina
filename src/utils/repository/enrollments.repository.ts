/* v8 ignore start */
import { asc, desc, eq, ilike, inArray, notLike, or, sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { enrollments } from '@/db/schema'

export async function insertEnrollment(
  data: Omit<typeof enrollments.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const db = await getDb()
  const [enrollment] = await db.insert(enrollments).values(data).returning()
  return enrollment
}

export async function findEnrollmentById(enrollmentId: string) {
  const db = await getDb()
  return db.query.enrollments.findFirst({
    where: eq(enrollments.id, enrollmentId),
  })
}

export async function findApprovedEnrollments() {
  const db = await getDb()
  return db.query.enrollments.findMany({
    where: eq(enrollments.status, 'approved'),
    orderBy: (enrollment) => [asc(enrollment.createdAt)],
  })
}

export async function findEnrollmentsWithInvitationSent() {
  const db = await getDb()
  return db.query.enrollments.findMany({
    where: eq(enrollments.invitationSent, true),
    columns: {
      id: true,
      phoneWhatsApp: true,
      preferredName: true,
      fullLegalName: true,
      invitationId: true,
    },
    orderBy: (enrollment) => [asc(enrollment.createdAt)],
  })
}

export async function findEnrollmentsForEmailExport() {
  const db = await getDb()
  return db.query.enrollments.findMany({
    columns: {
      email: true,
      status: true,
      invitationSent: true,
      invitationId: true,
    },
    orderBy: (enrollment) => [asc(enrollment.createdAt)],
  })
}

export async function findEnrollmentIdsExcludingDuplicates(): Promise<
  Array<string>
> {
  const db = await getDb()
  const rows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(notLike(enrollments.email, 'duplicate_%'))
    .orderBy(asc(enrollments.createdAt))
  return rows.map((row) => row.id)
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

function buildNameLookupPatterns(queries: Array<string>): Array<string> {
  const patterns = new Set<string>()

  for (const query of queries) {
    const trimmed = query.trim().replace(/\s+/g, ' ')
    if (trimmed.length >= 2) patterns.add(trimmed)
    for (const token of trimmed.split(' ')) {
      if (token.length >= 2) patterns.add(token)
    }
  }

  return [...patterns]
}

/** Fetches bounded candidates; ranking and ambiguity handling stay in the domain layer. */
export async function findEnrollmentContactLookupCandidates(
  queries: Array<string>,
) {
  const patterns = buildNameLookupPatterns(queries)
  if (patterns.length === 0) return []

  const conditions: Array<SQL> = patterns.flatMap((pattern) => [
    ilike(enrollments.fullLegalName, `%${pattern}%`),
    ilike(enrollments.preferredName, `%${pattern}%`),
  ])

  const db = await getDb()
  return db
    .select({
      enrollmentId: enrollments.id,
      fullLegalName: enrollments.fullLegalName,
      preferredName: enrollments.preferredName,
      email: enrollments.email,
      phoneWhatsApp: enrollments.phoneWhatsApp,
      status: enrollments.status,
    })
    .from(enrollments)
    .where(or(...conditions))
    .orderBy(desc(enrollments.createdAt))
    .limit(300)
}

/** Groups updates by status so bulk grading issues one UPDATE per target status. */
export async function bulkUpdateEnrollmentStatuses(
  updates: Array<{
    id: string
    status: (typeof enrollments.$inferSelect)['status']
  }>,
): Promise<void> {
  if (updates.length === 0) return
  const db = await getDb()
  const now = new Date()
  const grouped = new Map<
    (typeof enrollments.$inferSelect)['status'],
    Array<string>
  >()
  for (const { id, status } of updates) {
    const ids = grouped.get(status) ?? []
    ids.push(id)
    grouped.set(status, ids)
  }
  for (const [status, ids] of grouped) {
    await db
      .update(enrollments)
      .set({ status, updatedAt: now })
      .where(inArray(enrollments.id, ids))
  }
}
/* v8 ignore end */
