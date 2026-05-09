import { redirect } from '@tanstack/react-router'
import { AuthorizationError } from './types'
import { getAuthorizationService } from './index'
import type { Role } from './types'
import { getCurrentUser } from '@/utils/auth/auth'

interface ProtectRouteOptions {
  require?: Role
  ofCourse?: string
  redirectTo?: string
}

export async function protectRoute(
  options: ProtectRouteOptions = {},
): Promise<void> {
  const user = await getCurrentUser()
  const service = getAuthorizationService()
  const { require, ofCourse, redirectTo = '/dashboard' } = options

  if (require) {
    try {
      await service.hasRole(user.id, require)
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw redirect({ href: redirectTo })
      }
      throw error
    }
  }

  if (ofCourse && require) {
    try {
      await service.canPerformAction(
        user.id,
        'viewCourse' as const,
        'course',
        ofCourse,
      )
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw redirect({ href: redirectTo })
      }
      throw error
    }
  }
}
