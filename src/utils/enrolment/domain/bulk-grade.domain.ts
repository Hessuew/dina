export type BulkGradeStatus = 'approved' | 'waitlisted' | 'rejected'

export type BulkGradeThresholds = {
  /** Minimum evaluationSum for approval (inclusive). Required. */
  approveMin: number
  /** Minimum evaluationSum for waitlist (inclusive). Optional — omitting collapses to 2-band approve/reject. */
  waitlistMin?: number
}

export type BulkGradePreview = {
  approved: number
  waitlisted: number
  rejected: number
  total: number
}

/** Max possible evaluation sum (two reviewers × max score 4). */
export const BULK_GRADE_SUM_MAX = 8

export type BulkGradeValidationError =
  | 'approveMin_required'
  | 'approveMin_out_of_range'
  | 'waitlistMin_out_of_range'
  | 'waitlistMin_not_below_approveMin'

/**
 * Validate bulk-grade thresholds. Returns an array of errors (empty = valid).
 */
export function validateBulkGradeThresholds(
  thresholds: Partial<BulkGradeThresholds>,
): Array<BulkGradeValidationError> {
  const errors: Array<BulkGradeValidationError> = []
  const { approveMin, waitlistMin } = thresholds

  if (approveMin === undefined) {
    errors.push('approveMin_required')
    return errors
  }

  if (
    !Number.isInteger(approveMin) ||
    approveMin < 0 ||
    approveMin > BULK_GRADE_SUM_MAX
  ) {
    errors.push('approveMin_out_of_range')
  }

  if (waitlistMin !== undefined) {
    if (
      !Number.isInteger(waitlistMin) ||
      waitlistMin < 0 ||
      waitlistMin > BULK_GRADE_SUM_MAX
    ) {
      errors.push('waitlistMin_out_of_range')
    } else if (waitlistMin >= approveMin) {
      errors.push('waitlistMin_not_below_approveMin')
    }
  }

  return errors
}

/**
 * Assign a bulk-grade outcome status to a single enrollment based on its evaluationSum
 * and the configured thresholds.
 *
 * - sum >= approveMin → approved
 * - waitlistMin set AND sum >= waitlistMin → waitlisted
 * - otherwise → rejected
 */
export function assignBulkGradeStatus(
  sum: number,
  thresholds: BulkGradeThresholds,
): BulkGradeStatus {
  if (sum >= thresholds.approveMin) return 'approved'
  if (thresholds.waitlistMin !== undefined && sum >= thresholds.waitlistMin)
    return 'waitlisted'
  return 'rejected'
}

/**
 * Compute preview counts from a map of { sum → enrollmentCount } pairs.
 * Used to show the admin how many enrollments fall into each bucket before committing.
 */
export function computeBulkGradePreview(
  countsBySum: ReadonlyArray<{ sum: number; count: number }>,
  thresholds: BulkGradeThresholds,
): BulkGradePreview {
  let approved = 0
  let waitlisted = 0
  let rejected = 0

  for (const { sum, count } of countsBySum) {
    const status = assignBulkGradeStatus(sum, thresholds)
    if (status === 'approved') approved += count
    else if (status === 'waitlisted') waitlisted += count
    else rejected += count
  }

  return {
    approved,
    waitlisted,
    rejected,
    total: approved + waitlisted + rejected,
  }
}
