import type { Role } from '@/utils/authz/types'

export const STAFF_PRIVILEGES = [
  'attendance_override',
  'enrollment_contact_export',
] as const

export type StaffPrivilege = (typeof STAFF_PRIVILEGES)[number]

export type LiveStaffPrivilegeInput = {
  role: Role | null
  privileges: ReadonlyArray<StaffPrivilege>
  privilege: StaffPrivilege
}

export function isLiveStaffPrivilege({
  role,
  privileges,
  privilege,
}: LiveStaffPrivilegeInput): boolean {
  if (role === 'admin') return true
  if (role !== 'teacher') return false
  return privileges.includes(privilege)
}

export function assertTeacherPrivilegeTarget(role: Role | null): void {
  if (role !== 'teacher') {
    throw new Error('Staff Privileges can only be granted to Teacher-users')
  }
}

export const STAFF_PRIVILEGE_LABELS: Record<StaffPrivilege, string> = {
  attendance_override: 'Academy-wide attendance override',
  enrollment_contact_export: 'Enrolment contact export',
}

export function canShowStaffPrivilegePanel(
  isAdmin: boolean,
  role: Role | null | undefined,
): boolean {
  return isAdmin && role === 'teacher'
}

export function shouldApplyPrivilegePersist(
  persistTeacherId: string,
  currentTeacherId: string,
): boolean {
  return persistTeacherId === currentTeacherId
}
