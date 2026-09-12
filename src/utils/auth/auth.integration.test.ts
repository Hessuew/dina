import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as db from '@/db'
import { getCurrentUser, getUserProfile } from '@/utils/auth/auth'
import { withObservabilityRequest } from '@/utils/observability/request-context'
import * as supabase from '@/utils/supabase'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findFirst: vi.fn(),
}))

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.findFirst.mockReset()
  vi.spyOn(supabase, 'getSupabaseServerClient').mockReturnValue({
    auth: { getUser: mocks.getUser },
  } as unknown as ReturnType<typeof supabase.getSupabaseServerClient>)
  vi.spyOn(db, 'getDb').mockResolvedValue({
    query: { profiles: { findFirst: mocks.findFirst } },
  } as unknown as Awaited<ReturnType<typeof db.getDb>>)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('auth boundary telemetry (integration)', () => {
  it('logs unexpected session lookup failures without exception details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const providerError = new Error(
      'auth token database detail for user@test.dev',
    )
    mocks.getUser.mockRejectedValueOnce(providerError)

    try {
      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org', {
            headers: { 'x-request-id': 'auth-request-1' },
          }),
          () => getCurrentUser(),
        ),
      ).rejects.toBe(providerError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      expect(serialized.join('\n')).not.toContain(
        'auth token database detail for user@test.dev',
      )
      expect(JSON.parse(serialized[0])).toMatchObject({
        event: 'auth_session_lookup_failed',
        level: 'error',
        path: 'auth:getCurrentUser',
        requestId: 'auth-request-1',
        status: 'failure',
        errorCategory: 'auth_session_lookup',
      })
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('logs persisted-profile lookup failures with safe identity metadata', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error(
      'profile connectionString database detail',
    )
    mocks.findFirst.mockRejectedValueOnce(repositoryError)

    try {
      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org', {
            headers: { 'cf-ray': 'auth-ray-1' },
          }),
          () => getUserProfile('profile-user-1'),
        ),
      ).rejects.toBe(repositoryError)

      const serialized = errorSpy.mock.calls.map(([line]) => String(line))
      expect(serialized.join('\n')).not.toContain(
        'profile connectionString database detail',
      )
      expect(JSON.parse(serialized[0])).toMatchObject({
        event: 'auth_profile_lookup_failed',
        level: 'error',
        path: 'auth:getUserProfile',
        requestId: 'auth-ray-1',
        status: 'failure',
        userId: 'profile-user-1',
        errorCategory: 'auth_profile_read_persistence',
      })
    } finally {
      errorSpy.mockRestore()
    }
  })
})
