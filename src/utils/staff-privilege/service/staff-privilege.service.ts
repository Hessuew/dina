import type { StaffPrivilege } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import type { LogLevel } from '@/utils/observability/logger'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { getUserProfile } from '@/utils/auth/auth'
import { authz } from '@/utils/authz'
import { ValidationError } from '@/utils/errors'
import { assertTeacherPrivilegeTarget } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import {
  deleteStaffPrivilege,
  findPrivilegesForUser,
  insertStaffPrivilege,
} from '@/utils/staff-privilege/repository'

type StaffPrivilegeLogContext = {
  actorId: string
  targetUserId: string
  privilege: StaffPrivilege
  granted: boolean
  startedAt: number
}

function logStaffPrivilegeEvent(
  level: LogLevel,
  event: string,
  context: StaffPrivilegeLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:setStaffPrivilege',
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    targetUserId: context.targetUserId,
    privilege: context.privilege,
    granted: context.granted,
    ...fields,
  })
}

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

  const context: StaffPrivilegeLogContext = {
    actorId,
    targetUserId: data.userId,
    privilege: data.privilege,
    granted: data.granted,
    startedAt: performance.now(),
  }

  try {
    if (data.granted) {
      await insertStaffPrivilege(data.userId, data.privilege)
    } else {
      await deleteStaffPrivilege(data.userId, data.privilege)
    }

    const privileges = await findPrivilegesForUser(data.userId)
    logStaffPrivilegeEvent('info', 'staff_privilege_updated', context)
    return { privileges }
  } catch (error) {
    logStaffPrivilegeEvent('error', 'staff_privilege_update_failed', context, {
      errorCategory: 'staff_privilege_persistence',
    })
    throw error
  }
}
