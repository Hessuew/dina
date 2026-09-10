import { describe, expect, it, vi } from 'vitest'
import { seedProfile } from '@/../test/integration/seed'
import { getTeachersService } from '@/utils/teachers/service/teachers.service'
import { AuthorizationError, ValidationError } from '@/utils/errors'
import { setStaffPrivilegeService } from '@/utils/staff-privilege/service/staff-privilege.service'

describe('setStaffPrivilegeService (integration)', () => {
  it('lets an Admin grant and revoke a Teacher-user privilege', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const teacherId = await seedProfile({ role: 'teacher' })

    const granted = await setStaffPrivilegeService(adminId, {
      userId: teacherId,
      privilege: 'attendance_override',
      granted: true,
    })
    expect(granted.privileges).toEqual(['attendance_override'])

    const revoked = await setStaffPrivilegeService(adminId, {
      userId: teacherId,
      privilege: 'attendance_override',
      granted: false,
    })
    expect(revoked.privileges).toEqual([])

    const events = infoSpy.mock.calls.map(([line]) => JSON.parse(String(line)))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'staff_privilege_updated',
          path: 'serverFn:setStaffPrivilege',
          status: 'success',
          actorId: adminId,
          targetUserId: teacherId,
          privilege: 'attendance_override',
          granted: true,
        }),
        expect.objectContaining({
          event: 'staff_privilege_updated',
          path: 'serverFn:setStaffPrivilege',
          status: 'success',
          actorId: adminId,
          targetUserId: teacherId,
          privilege: 'attendance_override',
          granted: false,
        }),
      ]),
    )
  })

  it('rejects granting to a Student or Admin', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const studentId = await seedProfile({ role: 'student' })

    await expect(
      setStaffPrivilegeService(adminId, {
        userId: studentId,
        privilege: 'attendance_override',
        granted: true,
      }),
    ).rejects.toBeInstanceOf(ValidationError)

    await expect(
      setStaffPrivilegeService(adminId, {
        userId: adminId,
        privilege: 'attendance_override',
        granted: true,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects a Teacher-user granting privileges', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const otherId = await seedProfile({ role: 'teacher' })

    await expect(
      setStaffPrivilegeService(teacherId, {
        userId: otherId,
        privilege: 'attendance_override',
        granted: true,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('attaches grants only when the catalog viewer is Admin', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const teacherId = await seedProfile({ role: 'teacher' })
    const otherTeacherId = await seedProfile({ role: 'teacher' })
    await setStaffPrivilegeService(adminId, {
      userId: teacherId,
      privilege: 'enrollment_contact_export',
      granted: true,
    })

    const asTeacher = await getTeachersService(otherTeacherId)
    expect(
      asTeacher.teachers.find((row) => row.id === teacherId)?.staffPrivileges,
    ).toBeUndefined()

    const asAdmin = await getTeachersService(adminId)
    expect(
      asAdmin.teachers.find((row) => row.id === teacherId)?.staffPrivileges,
    ).toEqual(['enrollment_contact_export'])
  })
})
