/* v8 ignore start */
import { eq } from 'drizzle-orm'
import type { Role } from '@/utils/authz'
import { getDb } from '@/db'
import { invitations } from '@/db/schema'

export async function findInvitationByEmail(email: string) {
  const db = await getDb()
  return db.query.invitations.findFirst({
    where: eq(invitations.email, email),
    orderBy: (inv, { desc }) => [desc(inv.invitedAt)],
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

export async function insertInvitation(values: {
  email: string
  role: Role
  token: string
  expiresAt: Date
  status: 'pending'
  invitedBy: string
}) {
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
