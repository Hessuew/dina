import { createServerFn } from '@tanstack/react-start'
import { setStaffPrivilegeSchema } from '@/schemas/staff-privilege.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { setStaffPrivilegeService } from '@/utils/staff-privilege/service/staff-privilege.service'

export const setStaffPrivilege = createServerFn({ method: 'POST' })
  .inputValidator(setStaffPrivilegeSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return setStaffPrivilegeService(user.id, data)
  })
