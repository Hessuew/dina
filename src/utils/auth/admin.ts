import { createServerFn } from '@tanstack/react-start'
import { protectRoute } from '@/utils/authz'

export const checkAdminAccess = createServerFn({ method: 'POST' }).handler(
  async () => {
    await protectRoute({ require: 'admin' })
    return { isAdmin: true }
  },
)
