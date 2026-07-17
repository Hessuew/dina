// Builds the student-facing discipleship DTO. Privacy lives here: only the
// viewer's anchors and same-teacher pair structure leave as output; classmates
// never carry emails or foreign schedule times.

export type StudentViewPerson = {
  id: string
  fullName: string
  avatarUrl: string | null
}

export type StudentViewAssignment = {
  studentId: string
  teacherId: string
  pairId: string | null
  anchorAt: string | null
}

export type StudentViewPair = {
  id: string
  teacherId: string
  anchorAt: string | null
}

export type StudentViewGroup = {
  teacherId: string
  anchorAt: string | null
}

export type StudentViewRosterPair = {
  pairId: string
  members: Array<StudentViewPerson>
}

export type StudentDiscipleshipViewUnassigned = {
  kind: 'unassigned'
}

export type StudentDiscipleshipViewAssigned = {
  kind: 'assigned'
  teacher: StudentViewPerson
  individualAnchor: string | null
  pair: null | {
    partner: StudentViewPerson
    anchorAt: string | null
  }
  groupAnchor: string | null
  roster: {
    pairs: Array<StudentViewRosterPair>
    solos: Array<StudentViewPerson>
  }
}

export type StudentDiscipleshipView =
  | StudentDiscipleshipViewUnassigned
  | StudentDiscipleshipViewAssigned

export type BuildStudentDiscipleshipViewInput = {
  viewerId: string
  assignment: StudentViewAssignment | null
  teacher: StudentViewPerson | null
  classmates: ReadonlyArray<StudentViewPerson>
  teacherAssignments: ReadonlyArray<StudentViewAssignment>
  pairs: ReadonlyArray<StudentViewPair>
  groups: ReadonlyArray<StudentViewGroup>
}

function personMap(
  people: ReadonlyArray<StudentViewPerson>,
): Map<string, StudentViewPerson> {
  return new Map(people.map((p) => [p.id, p]))
}

function buildRoster(
  viewerId: string,
  teacherId: string,
  teacherAssignments: ReadonlyArray<StudentViewAssignment>,
  pairs: ReadonlyArray<StudentViewPair>,
  classmates: Map<string, StudentViewPerson>,
): StudentDiscipleshipViewAssigned['roster'] {
  const own = teacherAssignments.filter((a) => a.teacherId === teacherId)
  const viewerPairId = own.find((a) => a.studentId === viewerId)?.pairId ?? null
  const pairViews: Array<StudentViewRosterPair> = []

  for (const pair of pairs.filter((p) => p.teacherId === teacherId)) {
    // Own Peer Pair is shown in the schedule section, not duplicated here.
    if (pair.id === viewerPairId) continue
    const members = own
      .filter((a) => a.pairId === pair.id)
      .map((a) => classmates.get(a.studentId))
      .filter((m): m is StudentViewPerson => m !== undefined)
    if (members.length > 0) {
      pairViews.push({ pairId: pair.id, members })
    }
  }

  const solos = own
    .filter((a) => a.pairId === null && a.studentId !== viewerId)
    .map((a) => classmates.get(a.studentId))
    .filter((m): m is StudentViewPerson => m !== undefined)

  return { pairs: pairViews, solos }
}

function resolvePeer(
  viewerId: string,
  assignment: StudentViewAssignment,
  teacherAssignments: ReadonlyArray<StudentViewAssignment>,
  pairs: ReadonlyArray<StudentViewPair>,
  classmates: Map<string, StudentViewPerson>,
): StudentDiscipleshipViewAssigned['pair'] {
  if (!assignment.pairId) return null
  const pair = pairs.find((p) => p.id === assignment.pairId)
  if (!pair) return null
  const partnerRow = teacherAssignments.find(
    (a) =>
      a.pairId === assignment.pairId &&
      a.studentId !== viewerId &&
      a.teacherId === assignment.teacherId,
  )
  if (!partnerRow) return null
  const partner = classmates.get(partnerRow.studentId)
  if (!partner) return null
  return { partner, anchorAt: pair.anchorAt }
}

export function buildStudentDiscipleshipView(
  input: BuildStudentDiscipleshipViewInput,
): StudentDiscipleshipView {
  const { assignment, teacher } = input
  if (!assignment || !teacher) return { kind: 'unassigned' }

  const classmates = personMap(input.classmates)
  const groupAnchor =
    input.groups.find((g) => g.teacherId === assignment.teacherId)?.anchorAt ??
    null

  return {
    kind: 'assigned',
    teacher,
    individualAnchor: assignment.anchorAt,
    pair: resolvePeer(
      input.viewerId,
      assignment,
      input.teacherAssignments,
      input.pairs,
      classmates,
    ),
    groupAnchor,
    roster: buildRoster(
      input.viewerId,
      assignment.teacherId,
      input.teacherAssignments,
      input.pairs,
      classmates,
    ),
  }
}
