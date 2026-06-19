import type { EvaluationWithAuthor } from '@/utils/enrolment/repository/enrolment.repository'
import type { AdmissionCategory } from '@/utils/enrolment/domain/evaluation.domain'
import { scoreRequiresAdmissionCategory } from '@/utils/enrolment/domain/evaluation.domain'

export type EvaluationView = {
  myScore: number | null
  myNote: string
  myAdmissionCategory: AdmissionCategory | null
  admissionCategoryEnabled: boolean
  admissionCategoryMissing: boolean
  evaluationTotal: number
  evaluationCount: number
  otherEvaluators: Array<EvaluationWithAuthor>
  otherNotes: Array<EvaluationWithAuthor>
}

/**
 * Derive the read-only view model the overlay renders from the raw evaluation
 * rows and the current user id: the current user's own score/note/category,
 * the admission-category gating flags, the aggregate total/count, and the
 * other evaluators (and which of them left a non-empty note).
 */
export function deriveEvaluationView({
  evaluations,
  userId,
}: {
  evaluations: Array<EvaluationWithAuthor>
  userId: string
}): EvaluationView {
  const myEvaluation = evaluations.find((e) => e.evaluatorId === userId)
  const myScore = myEvaluation?.score ?? null
  const myAdmissionCategory = myEvaluation?.admissionCategory ?? null
  const admissionCategoryEnabled = scoreRequiresAdmissionCategory(myScore)
  const otherEvaluators = evaluations.filter((e) => e.evaluatorId !== userId)

  return {
    myScore,
    myNote: myEvaluation?.note ?? '',
    myAdmissionCategory,
    admissionCategoryEnabled,
    admissionCategoryMissing:
      admissionCategoryEnabled && myAdmissionCategory === null,
    evaluationTotal: evaluations.reduce(
      (sum, evaluation) => sum + (evaluation.score ?? 0),
      0,
    ),
    evaluationCount: evaluations.filter(
      (evaluation) => evaluation.score !== null,
    ).length,
    otherEvaluators,
    otherNotes: otherEvaluators.filter(
      (e) => e.note !== null && e.note.trim().length > 0,
    ),
  }
}

/** Re-selecting the active score clears it; any other value selects it. */
export function toggleScoreValue(
  value: number,
  myScore: number | null,
): number | null {
  return value === myScore ? null : value
}

/**
 * Local-evaluation patch for a score change. A null or below-passing score
 * (< 3) also clears the admission category, which only applies to 3/4.
 */
export function buildScorePatch(score: number | null): {
  score: number | null
  admissionCategory?: null
} {
  return {
    score,
    ...(!score || score < 3 ? { admissionCategory: null } : {}),
  }
}
