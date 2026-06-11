import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { seedProfile } from './profile'
import type { Role } from '@/utils/authz'
import { invitations } from '@/db/schema'

export async function seedInvitation(
  overrides: {
    id?: string
    email?: string
    role?: Role
    token?: string
    status?: 'pending' | 'accepted' | 'revoked'
    invitedBy?: string
    expiresAt?: Date
    otpHash?: string | null
    otpExpiresAt?: Date | null
    otpAttempts?: number
  } = {},
): Promise<{ id: string; token: string; email: string }> {
  const id = overrides.id ?? randomUUID()
  const token = overrides.token ?? randomUUID()
  const email = overrides.email ?? `${id}@test.dev`
  const invitedBy =
    overrides.invitedBy ?? (await seedProfile({ role: 'admin' }))
  const db = await getDb()
  await db.insert(invitations).values({
    id,
    email,
    role: overrides.role ?? 'student',
    token,
    status: overrides.status ?? 'pending',
    invitedBy,
    expiresAt:
      overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    otpHash: overrides.otpHash ?? null,
    otpExpiresAt: overrides.otpExpiresAt ?? null,
    otpAttempts: overrides.otpAttempts ?? 0,
  })
  return { id, token, email }
}
