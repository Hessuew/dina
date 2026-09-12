import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loginService } from '@/utils/auth/login'
import { withObservabilityRequest } from '@/utils/observability/request-context'

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseServerClient: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword },
  }),
}))

beforeEach(() => {
  mocks.signInWithPassword.mockReset()
})

describe('loginService (integration)', () => {
  it('logs a successful sign-in with safe identity and request metadata', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'request-1' },
      }),
      () => loginService({ email: 'user@test.dev', password: 'secret' }),
    )

    const event = JSON.parse(info.mock.calls[0][0])
    expect(event).toMatchObject({
      event: 'login_succeeded',
      level: 'info',
      path: 'serverFn:login',
      requestId: 'request-1',
      status: 'success',
      userId: 'user-1',
    })
    expect(event).not.toHaveProperty('email')
    expect(event).not.toHaveProperty('password')
    info.mockRestore()
  })

  it('keeps rejected sign-in telemetry redacted while preserving the user message', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: {
        code: 'invalid_credentials',
        message: 'password=do-not-log for user@test.dev',
      },
    })

    const result = await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'cf-ray': 'ray-1' },
      }),
      () => loginService({ email: 'user@test.dev', password: 'secret' }),
    )

    expect(result).toEqual({
      error: true,
      message: 'password=do-not-log for user@test.dev',
    })
    const line = info.mock.calls[0][0]
    expect(line).not.toContain('do-not-log')
    expect(line).not.toContain('user@test.dev')
    expect(JSON.parse(line)).toMatchObject({
      event: 'login_failed',
      errorCategory: 'auth_sign_in',
      level: 'info',
      path: 'serverFn:login',
      providerCode: 'invalid_credentials',
      requestId: 'ray-1',
      status: 'rejected',
    })
    info.mockRestore()
  })
})
