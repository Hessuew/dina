import { DefaultAuthorizationService } from './default-adapter'
import { createAuthorizationBuilder } from './builder'
import { withRequestCache } from './cache'
import type { AuthorizationService } from './types'

let serviceInstance: AuthorizationService | null = null

export function getAuthorizationService(): AuthorizationService {
  if (!serviceInstance) {
    serviceInstance = new DefaultAuthorizationService()
  }
  return serviceInstance
}

export function setAuthorizationService(service: AuthorizationService): void {
  serviceInstance = service
}

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
export type { AuthorizationService, Role, Action, ResourceType } from './types'
export { DefaultAuthorizationService } from './default-adapter'
export { protectRoute } from './route'
