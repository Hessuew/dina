import { z } from 'zod'
import { STAFF_PRIVILEGES } from '@/utils/staff-privilege/domain/staff-privilege.domain'

export const setStaffPrivilegeSchema = z.object({
  userId: z.uuid('Invalid user ID'),
  privilege: z.enum(STAFF_PRIVILEGES),
  granted: z.boolean(),
})
