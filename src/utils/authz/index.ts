import { createAuthorizationBuilder } from './builder'
import { getAuthorizationService } from './service'
import type { StaffPrivilege } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import { isLiveStaffPrivilege } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import { findPrivilegesForUser } from '@/utils/repository'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

export function authz(userId: string) {
  const service = getAuthorizationService()
  return createAuthorizationBuilder(userId, service, true)
}

export async function resolveAdminOrTeacherAccess(
  userId: string,
): Promise<{ isAdmin: boolean; isTeacher: boolean }> {
  const role = await getAuthorizationService().getRole(userId)
  return { isAdmin: role === 'admin', isTeacher: role === 'teacher' }
}

export async function hasStaffPrivilege(
  userId: string,
  privilege: StaffPrivilege,
): Promise<boolean> {
  const role = await getAuthorizationService().getRole(userId)
  if (role === 'admin') return true
  if (role !== 'teacher') return false
  const startedAt = performance.now()
  let privileges: Array<StaffPrivilege>
  try {
    privileges = await findPrivilegesForUser(userId)
  } catch (error) {
    logServerEvent('error', 'authorization_lookup_failed', {
      requestId: getRequestId(),
      path: 'authz:staff_privilege',
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      userId,
      privilege,
      errorCategory: 'authorization_staff_privilege_read_persistence',
    })
    throw error
  }
  return isLiveStaffPrivilege({ role, privileges, privilege })
}

export { setAuthorizationService } from './service'
export type { Role } from './types'
export { DefaultAuthorizationService } from './default-adapter'
export { protectRoute } from './route'
