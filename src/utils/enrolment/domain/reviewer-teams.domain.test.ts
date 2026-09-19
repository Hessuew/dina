import { describe, expect, it } from 'vitest'
import { buildReviewerTeams } from './reviewer-teams.domain'

describe('buildReviewerTeams', () => {
  it('replaces absent teachers with active substitutes', () => {
    expect(
      buildReviewerTeams(
        [
          { courseId: 'course-1', teacherId: 'absent' },
          { courseId: 'course-1', teacherId: 'peer' },
        ],
        [
          {
            courseId: 'course-1',
            substituteTeacherId: 'substitute',
            absentTeacherId: 'absent',
          },
        ],
        [
          { id: 'absent', fullName: 'Absent Teacher' },
          { id: 'peer', fullName: 'Peer Teacher' },
          { id: 'substitute', fullName: 'Substitute Teacher' },
        ],
      ),
    ).toEqual(
      new Map([
        [
          'course-1',
          [
            { id: 'peer', name: 'Peer Teacher' },
            { id: 'substitute', name: 'Substitute Teacher' },
          ],
        ],
      ]),
    )
  })

  it('deduplicates memberships and ignores profiles missing from persistence', () => {
    expect(
      buildReviewerTeams(
        [{ courseId: 'course-1', teacherId: 'teacher' }],
        [
          {
            courseId: 'course-1',
            substituteTeacherId: 'teacher',
            absentTeacherId: 'other',
          },
          {
            courseId: 'course-1',
            substituteTeacherId: 'missing',
            absentTeacherId: 'another',
          },
        ],
        [{ id: 'teacher', fullName: 'Teacher' }],
      ),
    ).toEqual(new Map([['course-1', [{ id: 'teacher', name: 'Teacher' }]]]))
  })

  it('returns no teams when there are no memberships', () => {
    expect(buildReviewerTeams([], [], [])).toEqual(new Map())
  })
})
