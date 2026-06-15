import { createAuthorizationBuilder } from './builder'
import { withRequestCache } from './cache'
import { getAuthorizationService } from './service'

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

export { withRequestCache }
export { setAuthorizationService } from './service'
export type { Role } from './types'
export { DefaultAuthorizationService } from './default-adapter'
export { protectRoute } from './route'
