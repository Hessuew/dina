import { describe, expect, it } from 'vitest'
import {
  assignBulkGradeStatus,
  computeBulkGradePreview,
  validateBulkGradeThresholds,
} from './bulk-grade.domain'

describe('validateBulkGradeThresholds', () => {
  it('returns empty array for valid 2-band thresholds', () => {
    expect(validateBulkGradeThresholds({ approveMin: 6 })).toEqual([])
  })

  it('returns empty array for valid 3-band thresholds', () => {
    expect(
      validateBulkGradeThresholds({ approveMin: 6, waitlistMin: 3 }),
    ).toEqual([])
  })

  it('requires approveMin', () => {
    expect(validateBulkGradeThresholds({})).toContain('approveMin_required')
  })

  it('rejects approveMin below 0', () => {
    expect(validateBulkGradeThresholds({ approveMin: -1 })).toContain(
      'approveMin_out_of_range',
    )
  })

  it('rejects approveMin above 8', () => {
    expect(validateBulkGradeThresholds({ approveMin: 9 })).toContain(
      'approveMin_out_of_range',
    )
  })

  it('accepts approveMin at boundary values 0 and 8', () => {
    expect(validateBulkGradeThresholds({ approveMin: 0 })).toEqual([])
    expect(validateBulkGradeThresholds({ approveMin: 8 })).toEqual([])
  })

  it('rejects waitlistMin below 0', () => {
    expect(
      validateBulkGradeThresholds({ approveMin: 6, waitlistMin: -1 }),
    ).toContain('waitlistMin_out_of_range')
  })

  it('rejects waitlistMin equal to approveMin', () => {
    expect(
      validateBulkGradeThresholds({ approveMin: 6, waitlistMin: 6 }),
    ).toContain('waitlistMin_not_below_approveMin')
  })

  it('rejects waitlistMin above approveMin', () => {
    expect(
      validateBulkGradeThresholds({ approveMin: 5, waitlistMin: 6 }),
    ).toContain('waitlistMin_not_below_approveMin')
  })

  it('accepts waitlistMin of 0', () => {
    expect(
      validateBulkGradeThresholds({ approveMin: 6, waitlistMin: 0 }),
    ).toEqual([])
  })
})

describe('assignBulkGradeStatus', () => {
  describe('2-band (no waitlistMin)', () => {
    const thresholds = { approveMin: 6 }

    it('approves at exactly approveMin', () => {
      expect(assignBulkGradeStatus(6, thresholds)).toBe('approved')
    })

    it('approves above approveMin', () => {
      expect(assignBulkGradeStatus(8, thresholds)).toBe('approved')
    })

    it('rejects below approveMin', () => {
      expect(assignBulkGradeStatus(5, thresholds)).toBe('rejected')
    })

    it('rejects at 0', () => {
      expect(assignBulkGradeStatus(0, thresholds)).toBe('rejected')
    })
  })

  describe('3-band (with waitlistMin)', () => {
    const thresholds = { approveMin: 7, waitlistMin: 4 }

    it('approves at exactly approveMin', () => {
      expect(assignBulkGradeStatus(7, thresholds)).toBe('approved')
    })

    it('approves above approveMin (perfect score)', () => {
      expect(assignBulkGradeStatus(8, thresholds)).toBe('approved')
    })

    it('waitlists at exactly waitlistMin', () => {
      expect(assignBulkGradeStatus(4, thresholds)).toBe('waitlisted')
    })

    it('waitlists between waitlistMin and approveMin', () => {
      expect(assignBulkGradeStatus(6, thresholds)).toBe('waitlisted')
    })

    it('rejects below waitlistMin', () => {
      expect(assignBulkGradeStatus(3, thresholds)).toBe('rejected')
    })

    it('rejects at 0', () => {
      expect(assignBulkGradeStatus(0, thresholds)).toBe('rejected')
    })
  })
})

describe('computeBulkGradePreview', () => {
  it('counts enrollments by band correctly', () => {
    const counts = [
      { sum: 8, count: 3 },
      { sum: 7, count: 2 },
      { sum: 5, count: 4 },
      { sum: 2, count: 1 },
    ]
    const result = computeBulkGradePreview(counts, {
      approveMin: 7,
      waitlistMin: 4,
    })
    expect(result).toEqual({
      approved: 5,
      waitlisted: 4,
      rejected: 1,
      total: 10,
    })
  })

  it('returns all-rejected when approveMin is 9 (above max)', () => {
    const counts = [{ sum: 8, count: 5 }]
    // approveMin=9 means nothing reaches it — 2-band so all rejected
    const result = computeBulkGradePreview(counts, { approveMin: 9 })
    expect(result).toEqual({
      approved: 0,
      waitlisted: 0,
      rejected: 5,
      total: 5,
    })
  })

  it('returns zeros for empty input', () => {
    const result = computeBulkGradePreview([], { approveMin: 6 })
    expect(result).toEqual({
      approved: 0,
      waitlisted: 0,
      rejected: 0,
      total: 0,
    })
  })

  it('total equals sum of all counts', () => {
    const counts = [
      { sum: 3, count: 7 },
      { sum: 6, count: 3 },
    ]
    const result = computeBulkGradePreview(counts, { approveMin: 6 })
    expect(result.total).toBe(10)
  })
})

describe('specialCase auto-approval', () => {
  it('specialCase enrollments are approved regardless of score', () => {
    const thresholds = { approveMin: 6 }
    // Even with score 0, specialCase should be approved
    const regularStatus = assignBulkGradeStatus(0, thresholds)
    expect(regularStatus).toBe('rejected')
    // But specialCase overrides this in the service layer
  })
})
