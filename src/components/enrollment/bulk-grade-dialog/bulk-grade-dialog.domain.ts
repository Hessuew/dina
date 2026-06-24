import type {
  BulkGradePreview,
  BulkGradeThresholds,
} from '@/utils/enrolment/domain/bulk-grade.domain'
import { BULK_GRADE_SUM_MAX } from '@/utils/enrolment/domain/bulk-grade.domain'

export type BulkGradeFormErrors = {
  approveMin: string | null
  waitlistMin: string | null
}

export type BulkGradeFormResult =
  | { valid: true; thresholds: BulkGradeThresholds }
  | { valid: false; errors: BulkGradeFormErrors }

/**
 * Parse raw string form inputs into validated thresholds, or return field-level
 * error messages when invalid. `waitlistMin` is optional — an empty string means
 * the field was left blank (2-band mode).
 */
export function parseFormInputs(
  rawApproveMin: string,
  rawWaitlistMin: string,
): BulkGradeFormResult {
  const errors: BulkGradeFormErrors = { approveMin: null, waitlistMin: null }

  const approveVal = parseInt(rawApproveMin, 10)
  if (rawApproveMin.trim() === '' || isNaN(approveVal)) {
    errors.approveMin = 'Required'
    return { valid: false, errors }
  }
  if (approveVal < 0 || approveVal > BULK_GRADE_SUM_MAX) {
    errors.approveMin = `Must be 0–${BULK_GRADE_SUM_MAX}`
    return { valid: false, errors }
  }

  const hasWaitlist = rawWaitlistMin.trim() !== ''
  if (!hasWaitlist) {
    return { valid: true, thresholds: { approveMin: approveVal } }
  }

  const waitlistVal = parseInt(rawWaitlistMin, 10)
  if (isNaN(waitlistVal)) {
    errors.waitlistMin = 'Must be a number'
    return { valid: false, errors }
  }
  if (waitlistVal < 0 || waitlistVal > BULK_GRADE_SUM_MAX) {
    errors.waitlistMin = `Must be 0–${BULK_GRADE_SUM_MAX}`
    return { valid: false, errors }
  }
  if (waitlistVal >= approveVal) {
    errors.waitlistMin = 'Must be below the approval threshold'
    return { valid: false, errors }
  }

  return {
    valid: true,
    thresholds: { approveMin: approveVal, waitlistMin: waitlistVal },
  }
}

/** Human-readable summary line for the preview counts panel. */
export function formatPreviewSummary(preview: BulkGradePreview): string {
  const parts = [
    `${preview.approved} approved`,
    ...(preview.waitlisted > 0 ? [`${preview.waitlisted} waitlisted`] : []),
    `${preview.rejected} rejected`,
  ]
  return parts.join(' · ')
}
