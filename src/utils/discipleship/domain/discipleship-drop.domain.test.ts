import { describe, expect, it } from 'vitest'
import { resolveDropIntent } from './discipleship-drop.domain'

const source = { studentId: 'a' }

describe('resolveDropIntent', () => {
  it('is a no-op when there is no target', () => {
    expect(resolveDropIntent(source, null)).toEqual({ type: 'noop' })
  })

  it('unassigns when dropped on the pool', () => {
    expect(resolveDropIntent(source, { kind: 'pool' })).toEqual({
      type: 'unassign',
      studentId: 'a',
    })
  })

  it('assigns when dropped on a teacher column', () => {
    expect(
      resolveDropIntent(source, { kind: 'teacher', teacherId: 't1' }),
    ).toEqual({ type: 'assign', studentId: 'a', teacherId: 't1' })
  })

  it('pairs when dropped on another student', () => {
    expect(
      resolveDropIntent(source, {
        kind: 'student',
        studentId: 'b',
        teacherId: 't1',
      }),
    ).toEqual({
      type: 'pair',
      studentIdA: 'a',
      studentIdB: 'b',
      teacherId: 't1',
    })
  })

  it('is a no-op when dropped on itself', () => {
    expect(
      resolveDropIntent(source, {
        kind: 'student',
        studentId: 'a',
        teacherId: 't1',
      }),
    ).toEqual({ type: 'noop' })
  })
})
