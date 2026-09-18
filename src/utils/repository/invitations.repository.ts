/* v8 ignore start */
import { eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { invitations } from '@/db/schema'

export type InvitationInsert = typeof invitations.$inferInsert

export async function findInvitationByEmail(email: string) {
  const db = await getDb()
  return db.query.invitations.findFirst({
    where: eq(invitations.email, email),
    orderBy: (inv, { desc }) => [desc(inv.invitedAt)],
  })
}

export async function findInvitationsByEmails(emails: Array<string>) {
  if (emails.length === 0) return []
  const db = await getDb()
  return db.query.invitations.findMany({
    where: inArray(invitations.email, emails),
  })
}

export async function findInvitationsByIds(invitationIds: Array<string>) {
  if (invitationIds.length === 0) return []
  const db = await getDb()
  return db.query.invitations.findMany({
    where: inArray(invitations.id, invitationIds),
    columns: { id: true, status: true },
  })
}

export async function findInvitationByToken(token: string) {
  const db = await getDb()
  return db.query.invitations.findFirst({
    where: eq(invitations.token, token),
  })
}

export async function findInvitationById(id: string) {
  const db = await getDb()
  return db.query.invitations.findFirst({
    where: eq(invitations.id, id),
  })
}

export async function findAllInvitationsWithInviter() {
  const db = await getDb()
  return db.query.invitations.findMany({
    with: {
      inviter: {
        columns: {
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: (inv, { desc }) => [desc(inv.invitedAt)],
  })
}

export async function insertInvitation(values: InvitationInsert) {
  const db = await getDb()
  const [invitation] = await db.insert(invitations).values(values).returning()
  return invitation
}

export async function updateInvitationById(
  id: string,
  values: {
    email: string
    token: string
    expiresAt: Date
    updatedAt: Date
  },
) {
  const db = await getDb()
  await db.update(invitations).set(values).where(eq(invitations.id, id))
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

export async function updateInvitationOtp(
  invitationId: string,
  values: {
    otpHash: string
    otpExpiresAt: Date
    otpAttempts: number
    updatedAt: Date
  },
) {
  const db = await getDb()
  await db
    .update(invitations)
    .set(values)
    .where(eq(invitations.id, invitationId))
}

export async function incrementOtpAttempts(invitationId: string) {
  const db = await getDb()
  await db
    .update(invitations)
    .set({
      otpAttempts: sql`${invitations.otpAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitationId))
}

export async function clearInvitationOtp(invitationId: string) {
  const db = await getDb()
  await db
    .update(invitations)
    .set({
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, invitationId))
}

export async function markInvitationAccepted(invitationId: string) {
  const db = await getDb()
  await db
    .update(invitations)
    .set({ status: 'accepted', acceptedAt: new Date(), updatedAt: new Date() })
    .where(eq(invitations.id, invitationId))
}

export async function revokeInvitationById(id: string) {
  const db = await getDb()
  await db
    .update(invitations)
    .set({ status: 'revoked', updatedAt: new Date() })
    .where(eq(invitations.id, id))
}

export async function deleteInvitationById(id: string) {
  const db = await getDb()
  await db.delete(invitations).where(eq(invitations.id, id))
}
/* v8 ignore end */
