import type { Action, AuthorizationService, ResourceType, Role } from './types'
import { AuthorizationError } from '@/utils/errors'

interface TestConfig {
  roles?: Map<string, Role>
  permissions?: Map<string, boolean>
}

export class TestAuthorizationService implements AuthorizationService {
  constructor(private config: TestConfig = {}) {
    this.config.roles = this.config.roles || new Map()
    this.config.permissions = this.config.permissions || new Map()
  }

  setRole(userId: string, role: Role): void {
    this.config.roles!.set(userId, role)
  }

  setPermission(key: string, allowed: boolean): void {
    this.config.permissions!.set(key, allowed)
  }

  async hasRole(userId: string, role: Role): Promise<void> {
    const hasIt = await this.isRole(userId, role)
    if (!hasIt) {
      throw new AuthorizationError(`${role} access required`, {
        code: 'ROLE_REQUIRED',
        internalMessage: `Test: User does not have role: ${role}`,
        details: { role },
      })
    }
  }

  async isRole(userId: string, role: Role): Promise<boolean> {
    return Promise.resolve(this.config.roles!.get(userId) === role)
  }

  async isAdmin(userId: string): Promise<boolean> {
    return Promise.resolve(this.config.roles!.get(userId) === 'admin')
  }

  async canPerformAction(
    userId: string,
    action: Action,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<void> {
    const allowed = await this.isAllowedToPerformAction(
      userId,
      action,
      resourceType,
      resourceId,
    )
    if (!allowed) {
      throw new AuthorizationError(
        `Not authorized to ${action} on ${resourceType}`,
        {
          code: 'ACTION_NOT_ALLOWED',
          internalMessage: `Test: User cannot perform ${action} on ${resourceType}:${resourceId}`,
          details: { action, resourceType, resourceId },
        },
      )
    }
  }

  async isAllowedToPerformAction(
    userId: string,
    action: Action,
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<boolean> {
    const key = `${userId}:${action}:${resourceType}:${resourceId}`
    return Promise.resolve(this.config.permissions!.get(key) ?? false)
  }
}
