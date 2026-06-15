import { DefaultAuthorizationService } from './default-adapter'
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
