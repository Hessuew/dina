import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { invitations, profiles } from '@/db/schema'

/* v8 ignore start */
export async function findInvitationByToken(token: string) {
  const db = await getDb()
  return db.query.invitations.findFirst({
    where: eq(invitations.token, token),
  })
}

export async function findProfileByEmail(email: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.email, email),
  })
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

export async function insertProfileOnConflict(values: {
  id: string
  email: string
  fullName: string
  role: 'student' | 'teacher' | 'admin'
}) {
  const db = await getDb()
  await db
    .insert(profiles)
    .values(values)
    .onConflictDoUpdate({
      target: profiles.id,
      set: { fullName: values.fullName, role: values.role },
    })
}
/* v8 ignore end */
