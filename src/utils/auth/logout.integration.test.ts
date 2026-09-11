import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logoutService } from '@/utils/auth/logout'
import { withObservabilityRequest } from '@/utils/observability/request-context'

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseServerClient: () => ({
    auth: { signOut: mocks.signOut },
  }),
}))

beforeEach(() => {
  mocks.signOut.mockReset()
})

describe('logoutService (integration)', () => {
  it('logs a successful sign-out with request metadata', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    mocks.signOut.mockResolvedValue({ error: null })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'request-1' },
      }),
      () => logoutService(),
    )

    expect(JSON.parse(info.mock.calls[0][0])).toMatchObject({
      event: 'logout_succeeded',
      level: 'info',
      path: 'serverFn:logout',
      requestId: 'request-1',
      status: 'success',
    })
    info.mockRestore()
  })

  it('preserves a returned provider message without logging it', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.signOut.mockResolvedValue({
      error: {
        code: 'session_missing',
        message: 'token=user-secret for user@test.dev',
      },
    })

    const result = await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'cf-ray': 'ray-1' },
      }),
      () => logoutService(),
    )

    expect(result).toEqual({
      error: true,
      message: 'token=user-secret for user@test.dev',
    })
    const line = error.mock.calls[0][0]
    expect(line).not.toContain('user-secret')
    expect(line).not.toContain('user@test.dev')
    expect(JSON.parse(line)).toMatchObject({
      errorCategory: 'auth_sign_out',
      event: 'logout_failed',
      level: 'error',
      path: 'serverFn:logout',
      providerCode: 'session_missing',
      requestId: 'ray-1',
      status: 'failed',
    })
    error.mockRestore()
  })

  it('logs unexpected provider exceptions without leaking the exception text', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.signOut.mockRejectedValue(
      new Error('connectionString=secret; user=user@test.dev'),
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'request-2' },
        }),
        () => logoutService(),
      ),
    ).rejects.toThrow('connectionString=secret; user=user@test.dev')

    const line = error.mock.calls[0][0]
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('user@test.dev')
    expect(JSON.parse(line)).toMatchObject({
      errorCategory: 'auth_sign_out',
      event: 'logout_failed',
      path: 'serverFn:logout',
      requestId: 'request-2',
      status: 'failed',
    })
    error.mockRestore()
  })
})
