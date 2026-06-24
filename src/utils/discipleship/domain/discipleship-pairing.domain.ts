// Pairing rules for discipleship: two students under the SAME teacher can be
// joined into a pair. A student may belong to at most one pair at a time.

export type PairCandidate = {
  studentId: string
  teacherId: string
  pairId: string | null
}

export type PairValidation =
  | { ok: true }
  | { ok: false; reason: 'same_student' | 'different_teacher' | 'already_paired' }

/**
 * Whether two assignment candidates may be joined into a pair. Returns the first
 * failing reason, or `{ ok: true }` when the pair is valid.
 */
export function canPairStudents(
  a: PairCandidate,
  b: PairCandidate,
): PairValidation {
  if (a.studentId === b.studentId) {
    return { ok: false, reason: 'same_student' }
  }
  if (a.teacherId !== b.teacherId) {
    return { ok: false, reason: 'different_teacher' }
  }
  if (a.pairId !== null || b.pairId !== null) {
    return { ok: false, reason: 'already_paired' }
  }
  return { ok: true }
}

/**
 * After a member leaves a pair, the pair should be dissolved once fewer than two
 * members remain (a "pair" of one is meaningless).
 */
export function shouldDissolvePair(remainingMemberCount: number): boolean {
  return remainingMemberCount < 2
}
