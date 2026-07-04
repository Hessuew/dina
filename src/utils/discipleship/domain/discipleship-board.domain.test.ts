import { describe, expect, it } from 'vitest'
import { buildBoard } from './discipleship-board.domain'
import type {
  BoardAssignment,
  BoardGroup,
  BoardPair,
  BoardStudent,
  BoardTeacher,
} from './discipleship-board.domain'

const teacher = (id: string): BoardTeacher => ({
  id,
  fullName: `Teacher ${id}`,
  email: `${id}@x.io`,
  avatarUrl: null,
})

const student = (id: string): BoardStudent => ({
  id,
  fullName: `Student ${id}`,
  email: `${id}@x.io`,
  avatarUrl: null,
})

const assignment = (over: Partial<BoardAssignment>): BoardAssignment => ({
  id: `as-${over.studentId}`,
  studentId: 's1',
  teacherId: 't1',
  pairId: null,
  anchorAt: null,
  ...over,
})

describe('buildBoard', () => {
  it('places unassigned students in the pool', () => {
    const board = buildBoard({
      teachers: [teacher('t1')],
      students: [student('s1'), student('s2')],
      assignments: [],
      pairs: [],
      groups: [],
    })
    expect(board.unassigned.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(board.columns[0].solo).toEqual([])
    expect(board.columns[0].pairs).toEqual([])
    expect(board.columns[0].groupAnchor).toBeNull()
  })

  it('places solo assigned students under their teacher and out of the pool', () => {
    const board = buildBoard({
      teachers: [teacher('t1')],
      students: [student('s1'), student('s2')],
      assignments: [assignment({ studentId: 's1', teacherId: 't1' })],
      pairs: [],
      groups: [],
    })
    expect(board.unassigned.map((s) => s.id)).toEqual(['s2'])
    expect(board.columns[0].solo.map((m) => m.student.id)).toEqual(['s1'])
  })

  it('groups paired members under their pair and exposes the group anchor', () => {
    const pairs: Array<BoardPair> = [
      { id: 'p1', teacherId: 't1', anchorAt: '2026-07-01T10:00:00.000Z' },
    ]
    const groups: Array<BoardGroup> = [
      { teacherId: 't1', anchorAt: '2026-07-02T10:00:00.000Z' },
    ]
    const board = buildBoard({
      teachers: [teacher('t1')],
      students: [student('s1'), student('s2'), student('s3')],
      assignments: [
        assignment({ studentId: 's1', teacherId: 't1', pairId: 'p1' }),
        assignment({ studentId: 's2', teacherId: 't1', pairId: 'p1' }),
        assignment({ studentId: 's3', teacherId: 't1' }),
      ],
      pairs,
      groups,
    })
    const column = board.columns[0]
    expect(column.groupAnchor).toBe('2026-07-02T10:00:00.000Z')
    expect(column.pairs).toHaveLength(1)
    expect(column.pairs[0].members.map((m) => m.student.id)).toEqual([
      's1',
      's2',
    ])
    expect(column.solo.map((m) => m.student.id)).toEqual(['s3'])
  })

  it('skips assignments whose student is missing (solo and paired)', () => {
    const board = buildBoard({
      teachers: [teacher('t1')],
      students: [],
      assignments: [
        assignment({ studentId: 'ghost-solo', teacherId: 't1' }),
        assignment({ studentId: 'ghost-pair', teacherId: 't1', pairId: 'p1' }),
      ],
      pairs: [{ id: 'p1', teacherId: 't1', anchorAt: null }],
      groups: [],
    })
    expect(board.columns[0].solo).toEqual([])
    expect(board.columns[0].pairs[0].members).toEqual([])
  })

  it('only includes a teacher’s own assignments and pairs in their column', () => {
    const board = buildBoard({
      teachers: [teacher('t1'), teacher('t2')],
      students: [student('s1'), student('s2')],
      assignments: [
        assignment({ studentId: 's1', teacherId: 't1' }),
        assignment({ studentId: 's2', teacherId: 't2' }),
      ],
      pairs: [{ id: 'p2', teacherId: 't2', anchorAt: null }],
      groups: [],
    })
    expect(board.columns[0].solo.map((m) => m.student.id)).toEqual(['s1'])
    expect(board.columns[0].pairs).toEqual([])
    expect(board.columns[1].solo.map((m) => m.student.id)).toEqual(['s2'])
    expect(board.columns[1].pairs).toHaveLength(1)
  })
})
