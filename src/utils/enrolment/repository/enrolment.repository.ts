import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { enrollments, invitations, profiles } from '@/db/schema'

/* v8 ignore start */
export async function insertEnrollment(
  data: Omit<typeof enrollments.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const db = await getDb()
  const [enrollment] = await db.insert(enrollments).values(data).returning()
  return enrollment
}

export async function findAllEnrollments() {
  const db = await getDb()
  return db.query.enrollments.findMany({
    orderBy: (e, { desc }) => [desc(e.createdAt)],
  })
}

export async function findEnrollmentById(enrollmentId: string) {
  const db = await getDb()
  return db.query.enrollments.findFirst({
    where: eq(enrollments.id, enrollmentId),
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
