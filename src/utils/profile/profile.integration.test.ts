import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { seedProfile } from '../../../test/integration/seed'
import { getDb } from '../../../test/integration/db'
import type { User } from '@supabase/supabase-js'
import type { UpdateProfileInput } from '@/schemas/profile.schema'
import {
  updateProfileBasicService,
  updateProfileWithEmailChangeService,
  verifyEmailChangeService,
} from '@/utils/profile/service/profile.service'
import { AppError } from '@/utils/errors'
import { profiles } from '@/db/schema'

const sendEmailChangeVerification = vi.hoisted(() => vi.fn())
const updateUserById = vi.hoisted(() => vi.fn())

vi.mock('@/utils/profile/service/email.service', () => ({
  buildVerifyLink: (token: string) =>
    `http://localhost/verify-email-change?token=${token}`,
  sendEmailChangeVerification,
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseAdminClient: () => ({
    auth: { admin: { updateUserById } },
  }),
}))

const makeUser = (id: string): User => ({ id }) as User

const makeInput = (
  overrides: Partial<UpdateProfileInput> = {},
): UpdateProfileInput => ({
  fullName: 'New Name',
  email: 'new@test.dev',
  bio: 'New bio',
  ...overrides,
})

const findProfile = async (id: string) => {
  const db = await getDb()
  return db.query.profiles.findFirst({ where: eq(profiles.id, id) })
}

beforeEach(() => {
  sendEmailChangeVerification.mockReset().mockResolvedValue(undefined)
  updateUserById.mockReset().mockResolvedValue({ error: null })
})

describe('updateProfileBasicService (integration)', () => {
  it('persists fullName and bio and reports no email change', async () => {
    const id = await seedProfile({ fullName: 'Old', bio: 'Old bio' })

    const result = await updateProfileBasicService(
      makeInput({ fullName: 'Updated', bio: 'Updated bio' }),
      makeUser(id),
    )

    expect(result).toEqual({
      emailChangePending: false,
      pendingEmail: undefined,
    })
    const row = await findProfile(id)
    expect(row?.fullName).toBe('Updated')
    expect(row?.bio).toBe('Updated bio')
    expect(row?.updatedAt).toBeInstanceOf(Date)
  })

  it('stores undefined bio as null', async () => {
    const id = await seedProfile({ bio: 'Old bio' })

    await updateProfileBasicService(makeInput({ bio: undefined }), makeUser(id))

    const row = await findProfile(id)
    expect(row?.bio).toBeNull()
  })
})

describe('updateProfileWithEmailChangeService (integration)', () => {
  it('persists pending email + token and sends the verification email', async () => {
    const id = await seedProfile({ email: 'old@test.dev' })

    const result = await updateProfileWithEmailChangeService(
      makeInput({ fullName: 'Renamed', email: 'pending@test.dev' }),
      makeUser(id),
    )

    expect(result).toEqual({
      emailChangePending: true,
      pendingEmail: 'pending@test.dev',
    })
    expect(sendEmailChangeVerification).toHaveBeenCalledTimes(1)
    expect(sendEmailChangeVerification).toHaveBeenCalledWith(
      'pending@test.dev',
      expect.stringContaining('/verify-email-change?token='),
    )

    const row = await findProfile(id)
    expect(row?.fullName).toBe('Renamed')
    expect(row?.pendingEmail).toBe('pending@test.dev')
    expect(row?.emailChangeTokenHash).toBeTruthy()
    expect(row?.emailChangeTokenExpiresAt?.getTime()).toBeGreaterThan(
      Date.now(),
    )
    expect(row?.emailChangeTokenAttempts).toBe(0)
    expect(row?.lastEmailChangeRequestAt).toBeInstanceOf(Date)
    // email itself is unchanged until verification completes it
    expect(row?.email).toBe('old@test.dev')
  })

  it('rejects when rate limited and does not send an email', async () => {
    const id = await seedProfile({
      email: 'old@test.dev',
      lastEmailChangeRequestAt: new Date(),
    })

    await expect(
      updateProfileWithEmailChangeService(
        makeInput({ email: 'pending@test.dev' }),
        makeUser(id),
      ),
    ).rejects.toMatchObject({ code: 'EMAIL_CHANGE_RATE_LIMITED', status: 429 })

    expect(sendEmailChangeVerification).not.toHaveBeenCalled()
    const row = await findProfile(id)
    expect(row?.pendingEmail).toBeNull()
  })

  it('clears tokens when sending the verification email fails', async () => {
    const id = await seedProfile({ email: 'old@test.dev' })
    sendEmailChangeVerification.mockRejectedValue(
      new AppError({
        code: 'EMAIL_SEND_FAILED',
        status: 500,
        userMessage: 'fail',
        internalMessage: 'fail',
      }),
    )

    await expect(
      updateProfileWithEmailChangeService(
        makeInput({ email: 'pending@test.dev' }),
        makeUser(id),
      ),
    ).rejects.toMatchObject({ code: 'EMAIL_SEND_FAILED' })

    const row = await findProfile(id)
    expect(row?.pendingEmail).toBeNull()
    expect(row?.emailChangeTokenHash).toBeNull()
    expect(row?.emailChangeTokenExpiresAt).toBeNull()
  })
})

describe('verifyEmailChangeService (integration)', () => {
  const makeToken = () => {
    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    return { token, tokenHash }
  }

  it('completes the email change for a valid token', async () => {
    const { token, tokenHash } = makeToken()
    const id = await seedProfile({
      email: 'old@test.dev',
      pendingEmail: 'pending@test.dev',
      emailChangeTokenHash: tokenHash,
      emailChangeTokenExpiresAt: new Date(Date.now() + 60_000),
    })

    const result = await verifyEmailChangeService(token)

    expect(result.success).toBe(true)
    expect(updateUserById).toHaveBeenCalledWith(id, {
      email: 'pending@test.dev',
    })
    const row = await findProfile(id)
    expect(row?.email).toBe('pending@test.dev')
    expect(row?.pendingEmail).toBeNull()
    expect(row?.emailChangeTokenHash).toBeNull()
  })

  it('returns failure for an unknown token without calling Supabase', async () => {
    await seedProfile({ email: 'old@test.dev' })

    const result = await verifyEmailChangeService('does-not-exist')

    expect(result.success).toBe(false)
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('returns failure for an expired token', async () => {
    const { token, tokenHash } = makeToken()
    await seedProfile({
      pendingEmail: 'pending@test.dev',
      emailChangeTokenHash: tokenHash,
      emailChangeTokenExpiresAt: new Date(Date.now() - 60_000),
    })

    const result = await verifyEmailChangeService(token)

    expect(result.success).toBe(false)
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('increments attempts when the Supabase update fails', async () => {
    const { token, tokenHash } = makeToken()
    const id = await seedProfile({
      pendingEmail: 'pending@test.dev',
      emailChangeTokenHash: tokenHash,
      emailChangeTokenExpiresAt: new Date(Date.now() + 60_000),
    })
    updateUserById.mockResolvedValue({ error: { message: 'boom' } })

    const result = await verifyEmailChangeService(token)

    expect(result.success).toBe(false)
    const row = await findProfile(id)
    expect(row?.emailChangeTokenAttempts).toBe(1)
    expect(row?.email).not.toBe('pending@test.dev')
  })
})
