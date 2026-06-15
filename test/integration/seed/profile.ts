import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import type { Role } from '@/utils/authz'
import { accountSecurity, profiles } from '@/db/schema'

export async function seedProfile(
  overrides: {
    id?: string
    email?: string
    fullName?: string
    role?: Role
    bio?: string
    resetTokenHash?: string
    resetTokenExpiresAt?: Date
    resetTokenAttempts?: number
    lastResetRequestAt?: Date
    pendingEmail?: string
    emailChangeTokenHash?: string
    emailChangeTokenExpiresAt?: Date
    emailChangeTokenAttempts?: number
    lastEmailChangeRequestAt?: Date
  } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(profiles).values({
    id,
    email: overrides.email ?? `${id}@test.dev`,
    fullName: overrides.fullName ?? 'Test User',
    role: overrides.role ?? 'student',
    ...(overrides.bio !== undefined ? { bio: overrides.bio } : {}),
  })

  const security = {
    ...(overrides.resetTokenHash !== undefined
      ? { resetTokenHash: overrides.resetTokenHash }
      : {}),
    ...(overrides.resetTokenExpiresAt !== undefined
      ? { resetTokenExpiresAt: overrides.resetTokenExpiresAt }
      : {}),
    ...(overrides.resetTokenAttempts !== undefined
      ? { resetTokenAttempts: overrides.resetTokenAttempts }
      : {}),
    ...(overrides.lastResetRequestAt !== undefined
      ? { lastResetRequestAt: overrides.lastResetRequestAt }
      : {}),
    ...(overrides.pendingEmail !== undefined
      ? { pendingEmail: overrides.pendingEmail }
      : {}),
    ...(overrides.emailChangeTokenHash !== undefined
      ? { emailChangeTokenHash: overrides.emailChangeTokenHash }
      : {}),
    ...(overrides.emailChangeTokenExpiresAt !== undefined
      ? { emailChangeTokenExpiresAt: overrides.emailChangeTokenExpiresAt }
      : {}),
    ...(overrides.emailChangeTokenAttempts !== undefined
      ? { emailChangeTokenAttempts: overrides.emailChangeTokenAttempts }
      : {}),
    ...(overrides.lastEmailChangeRequestAt !== undefined
      ? { lastEmailChangeRequestAt: overrides.lastEmailChangeRequestAt }
      : {}),
  }

  if (Object.keys(security).length > 0) {
    await db.insert(accountSecurity).values({ profileId: id, ...security })
  }

  return id
}
