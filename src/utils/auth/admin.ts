import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { protectRoute, resolveAdminOrTeacherAccess } from '@/utils/authz'
import { getCurrentUser } from '@/utils/auth/auth'

export const checkAdminAccess = createServerFn({ method: 'POST' }).handler(
  async () => {
    await protectRoute({ require: 'admin' })
    return { isAdmin: true }
  },
)

export const checkTeacherAccess = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(user.id)
    if (!isAdmin && !isTeacher) {
      throw redirect({ href: '/dashboard' })
    }
  },
)
