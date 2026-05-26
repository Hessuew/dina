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

export function isAllowed(userId: string) {
  const service = getAuthorizationService()
  return createAuthorizationBuilder(userId, service, false)
}

export async function resolveAdminOrTeacherAccess(
  userId: string,
): Promise<{ isAdmin: boolean; isTeacher: boolean }> {
  const [isAdmin, isTeacher] = await Promise.all([
    authz(userId).isAdmin(),
    authz(userId).isRole('teacher'),
  ])
  return { isAdmin, isTeacher }
}

export { withRequestCache }
export type { AuthorizationService, Role, Action, ResourceType } from './types'
export { AuthorizationError } from '@/utils/errors'
export { DefaultAuthorizationService } from './default-adapter'
export { protectRoute } from './route'
export { TestAuthorizationService } from './test-adapter'
