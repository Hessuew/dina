import { describe, expect, it } from 'vitest'
import { calculateEntityPermissions } from './permissions'

describe('calculateEntityPermissions', () => {
  it('admin is always isCourseTeacher and canManage regardless of teacher IDs', () => {
    expect(
      calculateEntityPermissions(
        'admin',
        { teacher1Id: null, teacher2Id: null },
        'u-1',
      ),
    ).toEqual({
      isAdmin: true,
      isCourseTeacher: true,
      canEdit: true,
      canManage: true,
    })
  })

  it('teacher matching teacher1Id is isCourseTeacher and canManage', () => {
    expect(
      calculateEntityPermissions(
        'teacher',
        { teacher1Id: 'u-1', teacher2Id: null },
        'u-1',
      ),
    ).toEqual({
      isAdmin: false,
      isCourseTeacher: true,
      canEdit: true,
      canManage: true,
    })
  })

  it('teacher matching teacher2Id is isCourseTeacher and canManage', () => {
    const result = calculateEntityPermissions(
      'teacher',
      { teacher1Id: null, teacher2Id: 'u-1' },
      'u-1',
    )
    expect(result.isCourseTeacher).toBe(true)
    expect(result.canManage).toBe(true)
  })

  it('teacher not matching either teacher ID cannot manage', () => {
    expect(
      calculateEntityPermissions(
        'teacher',
        { teacher1Id: 'other', teacher2Id: null },
        'u-1',
      ),
    ).toEqual({
      isAdmin: false,
      isCourseTeacher: false,
      canEdit: true,
      canManage: false,
    })
  })

  it('student has no edit or manage permissions', () => {
    expect(
      calculateEntityPermissions(
        'student',
        { teacher1Id: null, teacher2Id: null },
        'u-1',
      ),
    ).toEqual({
      isAdmin: false,
      isCourseTeacher: false,
      canEdit: false,
      canManage: false,
    })
  })
})
