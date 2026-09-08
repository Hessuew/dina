import { describe, expect, it } from 'vitest'
import {
  STAFF_PRIVILEGES,
  assertTeacherPrivilegeTarget,
  canShowStaffPrivilegePanel,
  isLiveStaffPrivilege,
  shouldApplyPrivilegePersist,
} from './staff-privilege.domain'

describe('isLiveStaffPrivilege', () => {
  it('is true for an Admin even without a grant row', () => {
    expect(
      isLiveStaffPrivilege({
        role: 'admin',
        privileges: [],
        privilege: 'attendance_override',
      }),
    ).toBe(true)
  })

  it('is true for a Teacher-user who holds the named grant', () => {
    expect(
      isLiveStaffPrivilege({
        role: 'teacher',
        privileges: ['attendance_override'],
        privilege: 'attendance_override',
      }),
    ).toBe(true)
  })

  it('is false for a Teacher-user who lacks that grant', () => {
    expect(
      isLiveStaffPrivilege({
        role: 'teacher',
        privileges: ['enrollment_contact_export'],
        privilege: 'attendance_override',
      }),
    ).toBe(false)
  })

  it('is false for a Student even with an orphan grant row', () => {
    expect(
      isLiveStaffPrivilege({
        role: 'student',
        privileges: ['attendance_override'],
        privilege: 'attendance_override',
      }),
    ).toBe(false)
  })
})

describe('assertTeacherPrivilegeTarget', () => {
  it('accepts a Teacher-user', () => {
    expect(() => assertTeacherPrivilegeTarget('teacher')).not.toThrow()
  })

  it('rejects a Student', () => {
    expect(() => assertTeacherPrivilegeTarget('student')).toThrow(
      'Staff Privileges can only be granted to Teacher-users',
    )
  })

  it('rejects an Admin', () => {
    expect(() => assertTeacherPrivilegeTarget('admin')).toThrow(
      'Staff Privileges can only be granted to Teacher-users',
    )
  })
})

describe('STAFF_PRIVILEGES', () => {
  it('lists the two independent first grants', () => {
    expect(STAFF_PRIVILEGES).toEqual([
      'attendance_override',
      'enrollment_contact_export',
    ])
  })
})

describe('canShowStaffPrivilegePanel', () => {
  it('shows only for Admin viewing a Teacher-user', () => {
    expect(canShowStaffPrivilegePanel(true, 'teacher')).toBe(true)
    expect(canShowStaffPrivilegePanel(true, 'admin')).toBe(false)
    expect(canShowStaffPrivilegePanel(false, 'teacher')).toBe(false)
  })
})

describe('shouldApplyPrivilegePersist', () => {
  it('is true only while the persist target is still selected', () => {
    expect(shouldApplyPrivilegePersist('t-1', 't-1')).toBe(true)
    expect(shouldApplyPrivilegePersist('t-1', 't-2')).toBe(false)
  })
})
