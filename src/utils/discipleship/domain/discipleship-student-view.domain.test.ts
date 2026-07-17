import { describe, expect, it } from 'vitest'
import { buildStudentDiscipleshipView } from './discipleship-student-view.domain'
import type {
  BuildStudentDiscipleshipViewInput,
  StudentViewAssignment,
  StudentViewPerson,
} from './discipleship-student-view.domain'

const person = (
  id: string,
  overrides: Partial<StudentViewPerson> = {},
): StudentViewPerson => ({
  id,
  fullName: `Name ${id}`,
  avatarUrl: null,
  ...overrides,
})

const assignment = (
  over: Partial<StudentViewAssignment>,
): StudentViewAssignment => ({
  studentId: 's1',
  teacherId: 't1',
  pairId: null,
  anchorAt: null,
  ...over,
})

function base(
  over: Partial<BuildStudentDiscipleshipViewInput> = {},
): BuildStudentDiscipleshipViewInput {
  return {
    viewerId: 's1',
    assignment: null,
    teacher: null,
    classmates: [],
    teacherAssignments: [],
    pairs: [],
    groups: [],
    ...over,
  }
}

describe('buildStudentDiscipleshipView', () => {
  it('returns unassigned when no assignment', () => {
    expect(buildStudentDiscipleshipView(base())).toEqual({ kind: 'unassigned' })
  })

  it('returns unassigned when teacher profile missing', () => {
    expect(
      buildStudentDiscipleshipView(
        base({
          assignment: assignment({ studentId: 's1', teacherId: 't1' }),
          teacher: null,
        }),
      ),
    ).toEqual({ kind: 'unassigned' })
  })

  it('exposes only viewer individual and group anchors', () => {
    const view = buildStudentDiscipleshipView(
      base({
        assignment: assignment({
          studentId: 's1',
          teacherId: 't1',
          anchorAt: '2026-07-01T10:00:00.000Z',
        }),
        teacher: person('t1', { fullName: 'Teacher One' }),
        classmates: [person('s2'), person('s3')],
        teacherAssignments: [
          assignment({
            studentId: 's1',
            teacherId: 't1',
            anchorAt: '2026-07-01T10:00:00.000Z',
          }),
          assignment({
            studentId: 's2',
            teacherId: 't1',
            anchorAt: '2099-01-01T00:00:00.000Z',
          }),
          assignment({ studentId: 's3', teacherId: 't1' }),
        ],
        groups: [{ teacherId: 't1', anchorAt: '2026-07-02T12:00:00.000Z' }],
      }),
    )
    expect(view.kind).toBe('assigned')
    if (view.kind !== 'assigned') return
    expect(view.individualAnchor).toBe('2026-07-01T10:00:00.000Z')
    expect(view.groupAnchor).toBe('2026-07-02T12:00:00.000Z')
    expect(view.pair).toBeNull()
    const serialized = JSON.stringify(view)
    expect(serialized).not.toContain('2099-01-01')
  })

  it('names peer partner and uses pair anchor only for viewer pair', () => {
    const view = buildStudentDiscipleshipView(
      base({
        assignment: assignment({
          studentId: 's1',
          teacherId: 't1',
          pairId: 'p1',
        }),
        teacher: person('t1'),
        classmates: [
          person('s2', { fullName: 'Peer Pat' }),
          person('s3', { fullName: 'Other Ollie' }),
          person('s4'),
        ],
        teacherAssignments: [
          assignment({ studentId: 's1', teacherId: 't1', pairId: 'p1' }),
          assignment({ studentId: 's2', teacherId: 't1', pairId: 'p1' }),
          assignment({ studentId: 's3', teacherId: 't1', pairId: 'p2' }),
          assignment({ studentId: 's4', teacherId: 't1', pairId: 'p2' }),
        ],
        pairs: [
          {
            id: 'p1',
            teacherId: 't1',
            anchorAt: '2026-08-01T09:00:00.000Z',
          },
          {
            id: 'p2',
            teacherId: 't1',
            anchorAt: '2099-12-31T23:59:00.000Z',
          },
        ],
      }),
    )
    expect(view.kind).toBe('assigned')
    if (view.kind !== 'assigned') return
    expect(view.pair).toEqual({
      partner: { id: 's2', fullName: 'Peer Pat', avatarUrl: null },
      anchorAt: '2026-08-01T09:00:00.000Z',
    })
    expect(JSON.stringify(view)).not.toContain('2099-12-31')
  })

  it('groups roster by pair, excludes viewer, and lists solos without times', () => {
    const view = buildStudentDiscipleshipView(
      base({
        assignment: assignment({
          studentId: 's1',
          teacherId: 't1',
          pairId: 'p1',
        }),
        teacher: person('t1'),
        classmates: [
          person('s2', { fullName: 'Partner' }),
          person('s3', { fullName: 'Solo Sam' }),
          person('s4', { fullName: 'PairA' }),
          person('s5', { fullName: 'PairB' }),
        ],
        teacherAssignments: [
          assignment({ studentId: 's1', teacherId: 't1', pairId: 'p1' }),
          assignment({ studentId: 's2', teacherId: 't1', pairId: 'p1' }),
          assignment({ studentId: 's3', teacherId: 't1' }),
          assignment({ studentId: 's4', teacherId: 't1', pairId: 'p2' }),
          assignment({ studentId: 's5', teacherId: 't1', pairId: 'p2' }),
        ],
        pairs: [
          { id: 'p1', teacherId: 't1', anchorAt: null },
          { id: 'p2', teacherId: 't1', anchorAt: null },
        ],
      }),
    )
    expect(view.kind).toBe('assigned')
    if (view.kind !== 'assigned') return
    // Own pair omitted from roster (partner lives in pair schedule section).
    expect(view.roster.pairs.find((p) => p.pairId === 'p1')).toBeUndefined()
    const p2Roster = view.roster.pairs.find((p) => p.pairId === 'p2')
    expect(p2Roster?.members.map((m) => m.fullName).sort()).toEqual([
      'PairA',
      'PairB',
    ])
    expect(view.roster.solos.map((s) => s.fullName)).toEqual(['Solo Sam'])
    expect(view.roster.pairs.every((p) => !('anchorAt' in p))).toBe(true)
    for (const m of [
      ...view.roster.pairs.flatMap((p) => p.members),
      ...view.roster.solos,
    ]) {
      expect(m).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          fullName: expect.any(String),
          avatarUrl: null,
        }),
      )
      expect(m).not.toHaveProperty('email')
      expect(m).not.toHaveProperty('anchorAt')
    }
  })
})
