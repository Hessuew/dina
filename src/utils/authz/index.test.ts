import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthorizationService } from '@/utils/authz/types'
import {
  DefaultAuthorizationService,
  hasStaffPrivilege,
  setAuthorizationService,
} from '@/utils/authz'
import { withObservabilityRequest } from '@/utils/observability/request-context'
import * as staffPrivilegeRepository from '@/utils/staff-privilege/repository'

vi.mock('@/utils/staff-privilege/repository', () => ({
  findPrivilegesForUser: vi.fn(),
}))

vi.mock('@/db', () => ({
  getDb: vi.fn(),
}))

vi.mock('@/utils/authz/route', () => ({
  protectRoute: vi.fn(),
}))

const findPrivilegesForUser = vi.mocked(
  staffPrivilegeRepository.findPrivilegesForUser,
)

afterEach(() => {
  vi.restoreAllMocks()
  findPrivilegesForUser.mockReset()
  setAuthorizationService(new DefaultAuthorizationService())
})

describe('hasStaffPrivilege authorization telemetry', () => {
  it.each([
    { role: 'admin' as const, result: true },
    { role: 'student' as const, result: false },
  ])('preserves $role short-circuit behavior', async ({ role, result }) => {
    setAuthorizationService({
      getRole: vi.fn().mockResolvedValue(role),
    } as unknown as AuthorizationService)

    await expect(
      hasStaffPrivilege('user-1', 'attendance_override'),
    ).resolves.toBe(result)
    expect(findPrivilegesForUser).not.toHaveBeenCalled()
  })

  it('resolves a teacher privilege without logging a success event', async () => {
    setAuthorizationService({
      getRole: vi.fn().mockResolvedValue('teacher'),
    } as unknown as AuthorizationService)
    findPrivilegesForUser.mockResolvedValue(['attendance_override'])
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'staff-privilege-success' },
        }),
        () => hasStaffPrivilege('user-1', 'attendance_override'),
      ),
    ).resolves.toBe(true)
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it('logs unexpected privilege-read failures without raw details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repositoryError = new Error(
      'privilege connectionString=secret; email=private@test.dev',
    )
    setAuthorizationService({
      getRole: vi.fn().mockResolvedValue('teacher'),
    } as unknown as AuthorizationService)
    findPrivilegesForUser.mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'staff-privilege-failure' },
        }),
        () => hasStaffPrivilege('user-1', 'enrollment_contact_export'),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('private@test.dev')
    expect(JSON.parse(line)).toMatchObject({
      event: 'authorization_lookup_failed',
      path: 'authz:staff_privilege',
      requestId: 'staff-privilege-failure',
      status: 'failure',
      userId: 'user-1',
      privilege: 'enrollment_contact_export',
      errorCategory: 'authorization_staff_privilege_read_persistence',
      durationMs: expect.any(Number),
    })
  })
})
