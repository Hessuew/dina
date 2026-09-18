import { describe, expect, it } from 'vitest'
import { selectUnscoredReviewerEnrollmentIds } from './substitution.domain'

describe('selectUnscoredReviewerEnrollmentIds', () => {
  it('keeps assignments without a reviewer score', () => {
    expect(
      selectUnscoredReviewerEnrollmentIds(
        [
          { enrollmentId: 'unscored', reviewerId: 'absent' },
          { enrollmentId: 'scored', reviewerId: 'absent' },
          { enrollmentId: 'other-reviewer', reviewerId: 'other' },
        ],
        [{ enrollmentId: 'scored', evaluatorId: 'absent', score: 3 }],
        'absent',
      ),
    ).toEqual(['unscored'])
  })

  it('treats a null reviewer score as unscored and ignores peer scores', () => {
    expect(
      selectUnscoredReviewerEnrollmentIds(
        [{ enrollmentId: 'enrollment', reviewerId: 'absent' }],
        [{ enrollmentId: 'enrollment', evaluatorId: 'peer', score: 4 }],
        'absent',
      ),
    ).toEqual(['enrollment'])
  })
})
