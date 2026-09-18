import { describe, expect, it } from 'vitest'
import { selectReviewerAdmittedEnrollmentIds } from './reviewer-admission.domain'

describe('selectReviewerAdmittedEnrollmentIds', () => {
  it('selects only enrollments admitted by their assigned reviewer', () => {
    expect(
      selectReviewerAdmittedEnrollmentIds(
        [
          { enrollmentId: 'admitted', reviewerId: 'reviewer' },
          { enrollmentId: 'pending', reviewerId: 'reviewer' },
          { enrollmentId: 'peer-admitted', reviewerId: 'reviewer' },
        ],
        [
          { enrollmentId: 'admitted', evaluatorId: 'reviewer', score: 3 },
          { enrollmentId: 'pending', evaluatorId: 'reviewer', score: 2 },
          { enrollmentId: 'peer-admitted', evaluatorId: 'peer', score: 4 },
        ],
      ),
    ).toEqual(['admitted'])
  })

  it('accepts both admitting scores and deduplicates assignments', () => {
    expect(
      selectReviewerAdmittedEnrollmentIds(
        [
          { enrollmentId: 'four', reviewerId: 'reviewer' },
          { enrollmentId: 'four', reviewerId: 'reviewer' },
          { enrollmentId: 'three', reviewerId: 'reviewer' },
        ],
        [
          { enrollmentId: 'four', evaluatorId: 'reviewer', score: 4 },
          { enrollmentId: 'three', evaluatorId: 'reviewer', score: 3 },
        ],
      ),
    ).toEqual(['four', 'three'])
  })

  it('ignores cleared evaluations', () => {
    expect(
      selectReviewerAdmittedEnrollmentIds(
        [{ enrollmentId: 'cleared', reviewerId: 'reviewer' }],
        [{ enrollmentId: 'cleared', evaluatorId: 'reviewer', score: null }],
      ),
    ).toEqual([])
  })
})
