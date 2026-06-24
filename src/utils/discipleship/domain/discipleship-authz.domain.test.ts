import { describe, expect, it } from 'vitest'
import { canManageDiscipleship } from './discipleship-authz.domain'

describe('canManageDiscipleship', () => {
  it('allows admins to manage any column', () => {
    expect(
      canManageDiscipleship({
        isAdmin: true,
        isTeacher: false,
        actorId: 'admin1',
        targetTeacherId: 't1',
      }),
    ).toBe(true)
  })

  it('allows a teacher to manage their own column', () => {
    expect(
      canManageDiscipleship({
        isAdmin: false,
        isTeacher: true,
        actorId: 't1',
        targetTeacherId: 't1',
      }),
    ).toBe(true)
  })

  it('forbids a teacher from managing another column', () => {
    expect(
      canManageDiscipleship({
        isAdmin: false,
        isTeacher: true,
        actorId: 't1',
        targetTeacherId: 't2',
      }),
    ).toBe(false)
  })

  it('forbids non-staff entirely', () => {
    expect(
      canManageDiscipleship({
        isAdmin: false,
        isTeacher: false,
        actorId: 's1',
        targetTeacherId: 't1',
      }),
    ).toBe(false)
  })
})
