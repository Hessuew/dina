export const EVALUATION_SCORES = [0, 1, 2, 3, 4] as const
const EVALUATION_SCORE_MAX = Math.max(...EVALUATION_SCORES)
/** Sum when both reviewer and peer each score the maximum. */
export const EVALUATION_SUM_PERFECT = EVALUATION_SCORE_MAX * 2

export type EvaluationScore = (typeof EVALUATION_SCORES)[number]

export const EVALUATION_SCORE_LABELS: Record<EvaluationScore, string> = {
  0: 'Rejected',
  1: 'Borderline',
  2: 'Reserve list',
  3: 'Admission',
  4: 'Strong admission',
}

export const ADMISSION_CATEGORY_OPTIONS = [
  {
    value: 'new',
    shortcut: 'A',
    label: 'Admitted in the new young convert, new discipleship category',
    shortLabel: 'new convert',
  },
  {
    value: 'emerging',
    shortcut: 'B',
    label: 'Admitted into emerging leaders discipleship category',
    shortLabel: 'emerging leader',
  },
  {
    value: 'established',
    shortcut: 'C',
    label: 'Admitted into an established leaders discipleship category',
    shortLabel: 'established leader',
  },
] as const

export type AdmissionCategory =
  (typeof ADMISSION_CATEGORY_OPTIONS)[number]['value']

export type ScoreKeyResult = {
  /** Next score value (0..4) or null when cleared. */
  score: EvaluationScore | null
  /** Whether this key was a score-related key (so the caller can preventDefault). */
  handled: boolean
  /** Whether the score value changed and should be persisted. */
  changed: boolean
}

export function scoreRequiresAdmissionCategory(score: number | null): boolean {
  return score === 3 || score === 4
}

/**
 * Keyboard state machine for setting a score.
 *
 * - `0`-`4` → set score instantly.
 * - pressing the currently-selected value again → clear to empty.
 * - `Backspace`/`Delete` → clear to empty.
 *
 * Any non-score key returns `handled: false` so the caller can handle it
 * (e.g. arrow navigation, Escape).
 */
export function reduceScoreKey(
  current: number | null,
  key: string,
): ScoreKeyResult {
  if (key === 'Backspace' || key === 'Delete') {
    return {
      score: null,
      handled: true,
      changed: current !== null,
    }
  }

  if (/^[0-4]$/.test(key)) {
    const candidate = Number(key) as EvaluationScore
    const next = candidate === current ? null : candidate
    return { score: next, handled: true, changed: true }
  }

  return {
    score: current as EvaluationScore | null,
    handled: false,
    changed: false,
  }
}

/** Optimistic patch applied to a single evaluator's evaluation. */
export type EvaluationPatch = {
  score?: number | null
  admissionCategory?: AdmissionCategory | null
  note?: string
}

/** One evaluator's evaluation of an enrollment (author-resolved). */
export type EvaluationEntry = {
  enrollmentId: string
  evaluatorId: string
  evaluatorName: string
  score: number | null
  admissionCategory: AdmissionCategory | null
  note: string | null
}

function mergeEvaluationEntry(
  entry: EvaluationEntry,
  patch: EvaluationPatch,
): EvaluationEntry {
  return {
    ...entry,
    ...(patch.score !== undefined
      ? {
          score: patch.score,
          ...(scoreRequiresAdmissionCategory(patch.score)
            ? {}
            : { admissionCategory: null }),
        }
      : {}),
    ...(patch.admissionCategory !== undefined
      ? { admissionCategory: patch.admissionCategory }
      : {}),
    ...(patch.note !== undefined ? { note: patch.note } : {}),
  }
}

/**
 * Apply an optimistic `patch` to the evaluator's entry in `list`, returning a
 * new list. Updates the existing entry when present, otherwise appends one.
 * Clearing or dropping a score below the admission threshold also clears the
 * admission category.
 */
export function applyEvaluationPatch(
  list: ReadonlyArray<EvaluationEntry>,
  author: { enrollmentId: string; evaluatorId: string; evaluatorName: string },
  patch: EvaluationPatch,
): Array<EvaluationEntry> {
  const next = [...list]
  const i = next.findIndex((e) => e.evaluatorId === author.evaluatorId)
  if (i >= 0) {
    next[i] = mergeEvaluationEntry(next[i], patch)
    return next
  }
  next.push({
    enrollmentId: author.enrollmentId,
    evaluatorId: author.evaluatorId,
    evaluatorName: author.evaluatorName,
    score: patch.score ?? null,
    admissionCategory: patch.admissionCategory ?? null,
    note: patch.note ?? null,
  })
  return next
}

/**
 * Compact list-cell summary of an enrollment's aggregate score.
 * Returns "—" when no one has scored yet.
 */
export function formatEvaluationSummary(sum: number, count: number): string {
  if (count === 0) return '—'
  return String(sum)
}

/** Label for a single score value. */
export function formatScore(score: number): string {
  return String(score)
}
