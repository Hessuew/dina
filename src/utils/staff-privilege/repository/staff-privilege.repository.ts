import { and, eq, inArray } from 'drizzle-orm'
import type { StaffPrivilege } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import { getDb } from '@/db'
import { staffPrivileges } from '@/db/schema'

/* v8 ignore start */
export async function findPrivilegesForUser(
  userId: string,
): Promise<Array<StaffPrivilege>> {
  const db = await getDb()
  const rows = await db.query.staffPrivileges.findMany({
    where: eq(staffPrivileges.userId, userId),
    columns: { privilege: true },
  })
  return rows.map((row) => row.privilege)
}

export async function findPrivilegesForUsers(
  userIds: Array<string>,
): Promise<Map<string, Array<StaffPrivilege>>> {
  const granted = new Map<string, Array<StaffPrivilege>>()
  if (userIds.length === 0) return granted

  const db = await getDb()
  const rows = await db.query.staffPrivileges.findMany({
    where: inArray(staffPrivileges.userId, userIds),
    columns: { userId: true, privilege: true },
  })
  for (const row of rows) {
    const list = granted.get(row.userId) ?? []
    list.push(row.privilege)
    granted.set(row.userId, list)
  }
  return granted
}

export async function insertStaffPrivilege(
  userId: string,
  privilege: StaffPrivilege,
): Promise<void> {
  const db = await getDb()
  await db
    .insert(staffPrivileges)
    .values({ userId, privilege })
    .onConflictDoNothing({
      target: [staffPrivileges.userId, staffPrivileges.privilege],
    })
}

export async function deleteStaffPrivilege(
  userId: string,
  privilege: StaffPrivilege,
): Promise<void> {
  const db = await getDb()
  await db
    .delete(staffPrivileges)
    .where(
      and(
        eq(staffPrivileges.userId, userId),
        eq(staffPrivileges.privilege, privilege),
      ),
    )
}
/* v8 ignore end */
