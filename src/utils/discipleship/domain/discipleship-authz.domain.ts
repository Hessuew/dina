// Who may manage a discipleship resource: admins manage any teacher's column;
// a teacher may only manage their own column (where they are the discipler).

export type DiscipleshipManageInput = {
  isAdmin: boolean
  isTeacher: boolean
  actorId: string
  targetTeacherId: string
}

export function canManageDiscipleship({
  isAdmin,
  isTeacher,
  actorId,
  targetTeacherId,
}: DiscipleshipManageInput): boolean {
  if (isAdmin) return true
  if (isTeacher) return actorId === targetTeacherId
  return false
}
