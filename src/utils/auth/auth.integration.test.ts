import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getCurrentUser,
  getRootUserContext,
  getUserProfile,
} from '@/utils/auth/auth'
import { withObservabilityRequest } from '@/utils/observability/request-context'
import * as sharedRepository from '@/utils/repository'
import * as supabase from '@/utils/supabase'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findProfileById: vi.fn(),
}))

beforeEach(() => {
  mocks.getUser.mockReset()
  mocks.findProfileById.mockReset()
  vi.spyOn(supabase, 'getSupabaseServerClient').mockReturnValue({
    auth: { getUser: mocks.getUser },
  } as unknown as ReturnType<typeof supabase.getSupabaseServerClient>)
  vi.spyOn(sharedRepository, 'findProfileById').mockImplementation(
    mocks.findProfileById,
  )
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
    mocks.findProfileById.mockRejectedValueOnce(repositoryError)

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

  it('logs root bootstrap session lookup failures with safe metadata', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const providerError = new Error('root auth token secret')
    mocks.getUser.mockRejectedValueOnce(providerError)

    try {
      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org', {
            headers: { 'x-request-id': 'root-session-request' },
          }),
          () => getRootUserContext(),
        ),
      ).rejects.toBe(providerError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(JSON.parse(line)).toMatchObject({
        event: 'auth_session_lookup_failed',
        path: 'auth:fetchUser',
        requestId: 'root-session-request',
        status: 'failure',
        errorCategory: 'auth_session_lookup',
      })
      expect(line).not.toContain('root auth token secret')
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('logs root bootstrap profile lookup failures with safe identity metadata', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error('root profile connectionString secret')
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { id: 'root-user-1', email: 'root@test.dev' } },
      error: null,
    })
    mocks.findProfileById.mockRejectedValueOnce(repositoryError)

    try {
      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org', {
            headers: { 'cf-ray': 'root-profile-ray' },
          }),
          () => getRootUserContext(),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(JSON.parse(line)).toMatchObject({
        event: 'auth_profile_lookup_failed',
        path: 'auth:fetchUser',
        requestId: 'root-profile-ray',
        userId: 'root-user-1',
        status: 'failure',
        errorCategory: 'auth_profile_read_persistence',
      })
      expect(line).not.toContain('root profile connectionString secret')
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('preserves the root user context while adding bootstrap telemetry boundaries', async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { id: 'root-user-2', email: 'root-user@test.dev' } },
      error: null,
    })
    mocks.findProfileById.mockResolvedValueOnce({
      avatarUrl: null,
      bio: 'Private bio',
      fullName: 'Root User',
      role: 'teacher',
    })

    await expect(getRootUserContext()).resolves.toEqual({
      avatarUrl: null,
      bio: 'Private bio',
      email: 'root-user@test.dev',
      id: 'root-user-2',
      fullName: 'Root User',
      role: 'teacher',
    })
  })
})
