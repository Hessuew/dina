// Resolves what a drag-and-drop gesture on the discipleship board MEANS, kept
// pure so the React drag handlers stay tiny. The board attaches descriptor data
// to each draggable/droppable; this maps (source, target) to a concrete intent.

export type DragSource = { studentId: string }

export type DropTarget =
  | { kind: 'teacher'; teacherId: string }
  | { kind: 'student'; studentId: string; teacherId: string }
  | { kind: 'pool' }

export type DropIntent =
  | { type: 'assign'; studentId: string; teacherId: string }
  | { type: 'pair'; studentIdA: string; studentIdB: string; teacherId: string }
  | { type: 'unassign'; studentId: string }
  | { type: 'noop' }

/**
 * Translate a drop gesture into an intent:
 * - onto a teacher column → assign the student to that teacher
 * - onto another student → pair the two under that student's teacher
 * - onto the unassigned pool → unassign the student
 * - no target, or dropping a student onto itself → no-op
 */
export function resolveDropIntent(
  source: DragSource,
  target: DropTarget | null,
): DropIntent {
  if (target === null) return { type: 'noop' }

  if (target.kind === 'pool') {
    return { type: 'unassign', studentId: source.studentId }
  }

  if (target.kind === 'teacher') {
    return {
      type: 'assign',
      studentId: source.studentId,
      teacherId: target.teacherId,
    }
  }

  if (source.studentId === target.studentId) return { type: 'noop' }

  return {
    type: 'pair',
    studentIdA: source.studentId,
    studentIdB: target.studentId,
    teacherId: target.teacherId,
  }
}
