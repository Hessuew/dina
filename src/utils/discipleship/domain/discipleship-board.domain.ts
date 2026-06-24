// Builds the discipleship board view-model from flat rows so the React shell only
// renders. A board has one column per teacher (their disciple group + meeting
// time, pairs, and solo students) plus the pool of not-yet-assigned students.

export type BoardTeacher = {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
}

export type BoardStudent = {
  id: string
  fullName: string
  email: string
  avatarUrl: string | null
}

export type BoardAssignment = {
  id: string
  studentId: string
  teacherId: string
  pairId: string | null
  anchorAt: string | null
}

export type BoardPair = {
  id: string
  teacherId: string
  anchorAt: string | null
}

export type BoardGroup = {
  teacherId: string
  anchorAt: string | null
}

export type BoardMember = {
  assignment: BoardAssignment
  student: BoardStudent
}

export type BoardPairView = {
  pair: BoardPair
  members: Array<BoardMember>
}

export type BoardColumn = {
  teacher: BoardTeacher
  groupAnchor: string | null
  pairs: Array<BoardPairView>
  solo: Array<BoardMember>
}

export type Board = {
  columns: Array<BoardColumn>
  unassigned: Array<BoardStudent>
}

export type BuildBoardInput = {
  teachers: ReadonlyArray<BoardTeacher>
  students: ReadonlyArray<BoardStudent>
  assignments: ReadonlyArray<BoardAssignment>
  pairs: ReadonlyArray<BoardPair>
  groups: ReadonlyArray<BoardGroup>
}

function toMember(
  assignment: BoardAssignment,
  studentMap: Map<string, BoardStudent>,
): BoardMember | null {
  const student = studentMap.get(assignment.studentId)
  if (!student) return null
  return { assignment, student }
}

function buildColumn(
  teacher: BoardTeacher,
  input: BuildBoardInput,
  studentMap: Map<string, BoardStudent>,
): BoardColumn {
  const own = input.assignments.filter((a) => a.teacherId === teacher.id)
  const groupAnchor =
    input.groups.find((g) => g.teacherId === teacher.id)?.anchorAt ?? null

  const pairs: Array<BoardPairView> = input.pairs
    .filter((p) => p.teacherId === teacher.id)
    .map((pair) => ({
      pair,
      members: own
        .filter((a) => a.pairId === pair.id)
        .map((a) => toMember(a, studentMap))
        .filter((m): m is BoardMember => m !== null),
    }))

  const solo = own
    .filter((a) => a.pairId === null)
    .map((a) => toMember(a, studentMap))
    .filter((m): m is BoardMember => m !== null)

  return { teacher, groupAnchor, pairs, solo }
}

export function buildBoard(input: BuildBoardInput): Board {
  const studentMap = new Map(input.students.map((s) => [s.id, s]))
  const assignedIds = new Set(input.assignments.map((a) => a.studentId))

  return {
    columns: input.teachers.map((teacher) =>
      buildColumn(teacher, input, studentMap),
    ),
    unassigned: input.students.filter((s) => !assignedIds.has(s.id)),
  }
}
