import { afterEach, describe, expect, it, vi } from 'vitest'

import { logServerEvent } from './logger'

describe('server logger', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes stable JSON fields to the matching console level', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    logServerEvent('info', 'health_check', {
      requestId: 'req-1',
      status: 'ok',
    })

    expect(info).toHaveBeenCalledWith(
      JSON.stringify({
        requestId: 'req-1',
        status: 'ok',
        level: 'info',
        event: 'health_check',
      }),
    )
  })

  it('redacts sensitive fields recursively and omits raw error messages', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    logServerEvent('warn', 'readiness_check', {
      token: 'secret-token',
      serviceRoleKey: 'service-role-secret',
      details: {
        connectionString: 'postgres://user:pass@example.test',
        message: 'password=secret',
      },
      cause: new Error('Authorization: Bearer secret-token'),
    })

    const line = warn.mock.calls[0][0]
    expect(line).not.toContain('secret-token')
    expect(line).not.toContain('service-role-secret')
    expect(line).not.toContain('postgres://')
    expect(line).not.toContain('password=secret')
    expect(JSON.parse(line)).toMatchObject({
      level: 'warn',
      event: 'readiness_check',
      token: '[REDACTED]',
      details: {
        connectionString: '[REDACTED]',
        message: '[REDACTED]',
      },
      cause: { name: 'Error' },
    })
  })
})
