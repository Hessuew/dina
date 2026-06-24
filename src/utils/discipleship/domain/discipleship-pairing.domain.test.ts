import { describe, expect, it } from 'vitest'
import {
  canPairStudents,
  shouldDissolvePair,
} from './discipleship-pairing.domain'
import type { PairCandidate } from './discipleship-pairing.domain'

const base = (over: Partial<PairCandidate>): PairCandidate => ({
  studentId: 's1',
  teacherId: 't1',
  pairId: null,
  ...over,
})

describe('canPairStudents', () => {
  it('accepts two distinct, unpaired students under the same teacher', () => {
    expect(
      canPairStudents(base({ studentId: 'a' }), base({ studentId: 'b' })),
    ).toEqual({ ok: true })
  })

  it('rejects pairing a student with itself', () => {
    expect(
      canPairStudents(base({ studentId: 'a' }), base({ studentId: 'a' })),
    ).toEqual({ ok: false, reason: 'same_student' })
  })

  it('rejects students under different teachers', () => {
    expect(
      canPairStudents(
        base({ studentId: 'a', teacherId: 't1' }),
        base({ studentId: 'b', teacherId: 't2' }),
      ),
    ).toEqual({ ok: false, reason: 'different_teacher' })
  })

  it('rejects when the first student is already paired', () => {
    expect(
      canPairStudents(
        base({ studentId: 'a', pairId: 'p1' }),
        base({ studentId: 'b' }),
      ),
    ).toEqual({ ok: false, reason: 'already_paired' })
  })

  it('rejects when the second student is already paired', () => {
    expect(
      canPairStudents(
        base({ studentId: 'a' }),
        base({ studentId: 'b', pairId: 'p1' }),
      ),
    ).toEqual({ ok: false, reason: 'already_paired' })
  })
})

describe('shouldDissolvePair', () => {
  it('dissolves when fewer than two members remain', () => {
    expect(shouldDissolvePair(1)).toBe(true)
    expect(shouldDissolvePair(0)).toBe(true)
  })

  it('keeps the pair when two or more members remain', () => {
    expect(shouldDissolvePair(2)).toBe(false)
  })
})
