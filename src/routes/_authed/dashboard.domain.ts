import type { profiles } from '@/db/schema'

type DashboardStaffRole = Exclude<
  (typeof profiles.$inferSelect)['role'],
  'student'
>

export function getDashboardAssignmentScope(_role: DashboardStaffRole) {
  return 'catalog' as const
}
