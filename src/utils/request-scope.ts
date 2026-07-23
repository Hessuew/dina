import { withDbConnection } from '@/db'
import { withAuthzCache } from '@/utils/authz/cache'

/** Enter the unified ambient authz-cache and database request scope. */
export function withRequestScope<T>(fn: () => Promise<T>): Promise<T> {
  return withAuthzCache(() => withDbConnection(fn))
}
