import { createAuthorizationBuilder } from './builder'
import { getAuthorizationService } from './service'
import type { StaffPrivilege } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import { isLiveStaffPrivilege } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import { findPrivilegesForUser } from '@/utils/staff-privilege/repository'

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
  const privileges = await findPrivilegesForUser(userId)
  return isLiveStaffPrivilege({ role, privileges, privilege })
}

export { setAuthorizationService } from './service'
export type { Role } from './types'
export { DefaultAuthorizationService } from './default-adapter'
export { protectRoute } from './route'
