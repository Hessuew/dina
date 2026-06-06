/**
 * Pure logic for the enrollment evaluation review surface.
 * Kept free of React/DB so it can be unit-tested in isolation (see ADR 0004).
 */

export type ScoreKeyResult = {
  /** Next score value (-9..9) or null when cleared. */
  score: number | null
  /** Whether the next keypress should be interpreted as a negative digit. */
  negativeArmed: boolean
  /** Whether this key was a score-related key (so the caller can preventDefault). */
  handled: boolean
  /** Whether the score value changed and should be persisted. */
  changed: boolean
}

/**
 * Keyboard state machine for setting a score.
 *
 * - `1`-`9` → set positive instantly.
 * - `0` → set 0.
 * - `-` → arm negative; the next `1`-`9` becomes negative.
 * - pressing the currently-selected value again → clear to empty.
 * - `Backspace`/`Delete` → clear to empty.
 *
 * Any non-score key returns `handled: false` so the caller can handle it
 * (e.g. arrow navigation, Escape).
 */
export function reduceScoreKey(
  current: number | null,
  key: string,
  negativeArmed: boolean,
): ScoreKeyResult {
  if (key === '-') {
    return { score: current, negativeArmed: true, handled: true, changed: false }
  }

  if (key === 'Backspace' || key === 'Delete') {
    return {
      score: null,
      negativeArmed: false,
      handled: true,
      changed: current !== null,
    }
  }

  if (/^[0-9]$/.test(key)) {
    const digit = Number(key)
    // -0 is just 0; only 1-9 can be negative.
    const candidate = negativeArmed && digit > 0 ? -digit : digit
    // Re-pressing the active value clears it.
    const next = candidate === current ? null : candidate
    return { score: next, negativeArmed: false, handled: true, changed: true }
  }

  return { score: current, negativeArmed, handled: false, changed: false }
}

/**
 * Compact list-cell summary of an enrollment's aggregate score.
 * Returns "—" when no one has scored yet.
 */
export function formatEvaluationSummary(sum: number, count: number): string {
  if (count === 0) return '—'
  const sign = sum > 0 ? '+' : ''
  return `${sign}${sum} · ${count}`
}

/** Signed label for a single score value (e.g. +5, 0, -3). */
export function formatScore(score: number): string {
  return score > 0 ? `+${score}` : String(score)
}
