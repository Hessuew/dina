import type { Action, AuthorizationService, ResourceType, Role } from './types'

class AuthorizationBuilder {
  constructor(
    private userId: string,
    private service: AuthorizationService,
    private throwOnDeny: boolean = true,
  ) {}

  perform(action: Action): ResourceAuthorizationBuilder {
    return new ResourceAuthorizationBuilder(
      this.userId,
      action,
      this.service,
      this.throwOnDeny,
    )
  }

  hasRole(role: Role): Promise<void> {
    return this.service.hasRole(this.userId, role)
  }

  isRole(role: Role): Promise<boolean> {
    return this.service.isRole(this.userId, role)
  }

  isAdmin(): Promise<boolean> {
    return this.service.isAdmin(this.userId)
  }
}

class ResourceAuthorizationBuilder {
  constructor(
    private userId: string,
    private action: Action,
    private service: AuthorizationService,
    private throwOnDeny: boolean,
  ) {}

  on(resourceType: ResourceType, resourceId: string): Promise<boolean | void> {
    if (this.throwOnDeny) {
      return this.service.canPerformAction(
        this.userId,
        this.action,
        resourceType,
        resourceId,
      )
    }
    return this.service.isAllowedToPerformAction(
      this.userId,
      this.action,
      resourceType,
      resourceId,
    )
  }
}

export function createAuthorizationBuilder(
  userId: string,
  service: AuthorizationService,
  throwOnDeny: boolean = true,
): AuthorizationBuilder {
  return new AuthorizationBuilder(userId, service, throwOnDeny)
}
