import type { StaffPrivilege } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import { getUserProfile } from '@/utils/auth/auth'
import { authz } from '@/utils/authz'
import { ValidationError } from '@/utils/errors'
import { assertTeacherPrivilegeTarget } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import {
  deleteStaffPrivilege,
  findPrivilegesForUser,
  insertStaffPrivilege,
} from '@/utils/staff-privilege/repository'

export async function setStaffPrivilegeService(
  actorId: string,
  data: { userId: string; privilege: StaffPrivilege; granted: boolean },
) {
  await authz(actorId).hasRole('admin')
  const target = await getUserProfile(data.userId)
  try {
    assertTeacherPrivilegeTarget(target.role)
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : 'Invalid privilege target',
      { details: { userId: data.userId, role: target.role } },
    )
  }

  if (data.granted) {
    await insertStaffPrivilege(data.userId, data.privilege)
  } else {
    await deleteStaffPrivilege(data.userId, data.privilege)
  }

  return { privileges: await findPrivilegesForUser(data.userId) }
}
