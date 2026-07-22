import type { PairValidation } from '@/utils/discipleship/domain/discipleship-pairing.domain'
import type {
  BoardAssignment,
  BoardGroup,
  BoardPair,
} from '@/utils/discipleship/domain/discipleship-board.domain'
import type { StudentDiscipleshipView } from '@/utils/discipleship/domain/discipleship-student-view.domain'
import type {
  AssignStudentToTeacherInput,
  PairStudentsInput,
  SetGroupScheduleInput,
  SetIndividualScheduleInput,
  SetPairScheduleInput,
  UnassignStudentInput,
  UnpairStudentInput,
} from '@/schemas/discipleship.schema'
import { resolveAdminOrTeacherAccess } from '@/utils/authz'
import { getAuthorizationService } from '@/utils/authz/service'
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from '@/utils/errors'
import { canManageDiscipleship } from '@/utils/discipleship/domain/discipleship-authz.domain'
import {
  canPairStudents,
  shouldDissolvePair,
} from '@/utils/discipleship/domain/discipleship-pairing.domain'
import { buildStudentDiscipleshipView } from '@/utils/discipleship/domain/discipleship-student-view.domain'
import {
  clearAssignmentPair,
  deleteAssignmentByStudentId,
  deletePair,
  findAllAssignments,
  findAllGroups,
  findAllPairs,
  findAssignmentByStudentId,
  findAssignmentsByPairId,
  findAssignmentsByTeacher,
  findDiscipleshipStudents,
  findDiscipleshipTeachers,
  findGroupsByTeacher,
  findPairById,
  findPairsByTeacher,
  findPublicPersonById,
  findPublicPersonsByIds,
  insertAssignment,
  insertPair,
  setAssignmentAnchor,
  setAssignmentPair,
  setPairAnchor,
  updateAssignmentTeacher,
  upsertGroupAnchor,
} from '@/utils/discipleship/repository'

type ManageFlags = { isAdmin: boolean; isTeacher: boolean }
type AssignmentRow = Awaited<ReturnType<typeof findAssignmentByStudentId>>

async function requireManage(
  userId: string,
  targetTeacherId: string,
): Promise<ManageFlags> {
  const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
  const allowed = canManageDiscipleship({
    isAdmin,
    isTeacher,
    actorId: userId,
    targetTeacherId,
  })
  if (!allowed) throw new AuthorizationError()
  return { isAdmin, isTeacher }
}

const PAIR_ERROR: Record<
  Exclude<PairValidation, { ok: true }>['reason'],
  string
> = {
  same_student: 'A student cannot be paired with themselves.',
  different_teacher: 'Both students must be under the same teacher to pair.',
  already_paired: 'One of these students is already in a pair.',
}

async function dissolvePairIfNeeded(
  pairId: string | null,
  leavingStudentId: string,
): Promise<void> {
  if (!pairId) return
  const members = await findAssignmentsByPairId(pairId)
  const remaining = members.filter(
    (m) => m.studentId !== leavingStudentId,
  ).length
  if (shouldDissolvePair(remaining)) await deletePair(pairId)
  else await clearAssignmentPair(leavingStudentId)
}

// Assign (or move) a student under `teacherId`, dissolving any pair they leave.
// Moving a student already discipled by another teacher requires manage rights
// over that source column too.
async function assignInternal(
  studentId: string,
  teacherId: string,
  flags: ManageFlags,
  userId: string,
): Promise<void> {
  const existing = await findAssignmentByStudentId(studentId)
  if (existing && existing.teacherId === teacherId) return
  if (existing) {
    const allowed = canManageDiscipleship({
      ...flags,
      actorId: userId,
      targetTeacherId: existing.teacherId,
    })
    if (!allowed) throw new AuthorizationError()
    await dissolvePairIfNeeded(existing.pairId, studentId)
    await updateAssignmentTeacher(studentId, teacherId)
    return
  }
  await insertAssignment(studentId, teacherId)
}

function toAssignmentDTO(row: {
  id: string
  studentId: string
  teacherId: string
  pairId: string | null
  anchorAt: Date | null
}): BoardAssignment {
  return {
    id: row.id,
    studentId: row.studentId,
    teacherId: row.teacherId,
    pairId: row.pairId,
    anchorAt: row.anchorAt?.toISOString() ?? null,
  }
}

function toPairDTO(row: {
  id: string
  teacherId: string
  anchorAt: Date | null
}): BoardPair {
  return {
    id: row.id,
    teacherId: row.teacherId,
    anchorAt: row.anchorAt?.toISOString() ?? null,
  }
}

function toGroupDTO(row: {
  teacherId: string
  anchorAt: Date | null
}): BoardGroup {
  return {
    teacherId: row.teacherId,
    anchorAt: row.anchorAt?.toISOString() ?? null,
  }
}

export async function getDiscipleshipBoardService(userId: string) {
  const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
  if (!isAdmin && !isTeacher) throw new AuthorizationError()

  const [teachers, students, assignments, pairs, groups] = await Promise.all([
    findDiscipleshipTeachers(),
    findDiscipleshipStudents(),
    isAdmin ? findAllAssignments() : findAssignmentsByTeacher(userId),
    isAdmin ? findAllPairs() : findPairsByTeacher(userId),
    isAdmin ? findAllGroups() : findGroupsByTeacher(userId),
  ])

  return {
    isAdmin,
    currentUserId: userId,
    teachers: isAdmin ? teachers : teachers.filter((t) => t.id === userId),
    students,
    assignments: assignments.map(toAssignmentDTO),
    pairs: pairs.map(toPairDTO),
    groups: groups.map(toGroupDTO),
  }
}

function isoOrNull(value: Date | null | undefined): string | null {
  return value?.toISOString() ?? null
}

type StudentAssignmentRow = NonNullable<AssignmentRow>
type PairRow = Awaited<ReturnType<typeof findPairsByTeacher>>[number]
type GroupRow = Awaited<ReturnType<typeof findGroupsByTeacher>>[number]
type PublicPerson = NonNullable<
  Awaited<ReturnType<typeof findPublicPersonById>>
>

// Privacy: only the viewer's individual / pair / group times enter the builder.
// Classmate assignment rows carry pair structure only (no times).
function toStudentViewBuilderInput(args: {
  viewerId: string
  assignment: StudentAssignmentRow
  teacher: PublicPerson | null | undefined
  classmates: Array<PublicPerson>
  teacherAssignments: Array<StudentAssignmentRow>
  pairs: Array<PairRow>
  groups: Array<GroupRow>
}) {
  const { assignment, viewerId } = args
  const viewerPairId = assignment.pairId
  return {
    viewerId,
    assignment: {
      studentId: assignment.studentId,
      teacherId: assignment.teacherId,
      pairId: assignment.pairId,
      anchorAt: isoOrNull(assignment.anchorAt),
    },
    teacher: args.teacher
      ? {
          id: args.teacher.id,
          fullName: args.teacher.fullName,
          avatarUrl: args.teacher.avatarUrl,
        }
      : null,
    classmates: args.classmates.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      avatarUrl: c.avatarUrl,
    })),
    teacherAssignments: args.teacherAssignments.map((a) => ({
      studentId: a.studentId,
      teacherId: a.teacherId,
      pairId: a.pairId,
      anchorAt: null,
    })),
    pairs: args.pairs.map((p) => ({
      id: p.id,
      teacherId: p.teacherId,
      anchorAt: p.id === viewerPairId ? isoOrNull(p.anchorAt) : null,
    })),
    groups: args.groups.map((g) => ({
      teacherId: g.teacherId,
      anchorAt: isoOrNull(g.anchorAt),
    })),
  }
}

export async function getStudentDiscipleshipViewService(
  userId: string,
): Promise<StudentDiscipleshipView> {
  const role = await getAuthorizationService().getRole(userId)
  if (role !== 'student') throw new AuthorizationError()

  const assignment = await findAssignmentByStudentId(userId)
  if (!assignment) return { kind: 'unassigned' }

  const [teacher, teacherAssignments, pairs, groups] = await Promise.all([
    findPublicPersonById(assignment.teacherId),
    findAssignmentsByTeacher(assignment.teacherId),
    findPairsByTeacher(assignment.teacherId),
    findGroupsByTeacher(assignment.teacherId),
  ])

  const classmateIds = teacherAssignments
    .map((a) => a.studentId)
    .filter((id) => id !== userId)
  const classmates = await findPublicPersonsByIds(classmateIds)

  return buildStudentDiscipleshipView(
    toStudentViewBuilderInput({
      viewerId: userId,
      assignment,
      teacher,
      classmates,
      teacherAssignments,
      pairs,
      groups,
    }),
  )
}

export async function assignStudentToTeacherService(
  data: AssignStudentToTeacherInput,
  userId: string,
) {
  const flags = await requireManage(userId, data.teacherId)
  await assignInternal(data.studentId, data.teacherId, flags, userId)
}

export async function unassignStudentService(
  data: UnassignStudentInput,
  userId: string,
) {
  const existing = await findAssignmentByStudentId(data.studentId)
  if (!existing) return
  await requireManage(userId, existing.teacherId)
  await dissolvePairIfNeeded(existing.pairId, data.studentId)
  await deleteAssignmentByStudentId(data.studentId)
}

function toCandidate(row: NonNullable<AssignmentRow>) {
  return {
    studentId: row.studentId,
    teacherId: row.teacherId,
    pairId: row.pairId,
  }
}

export async function pairStudentsService(
  data: PairStudentsInput,
  userId: string,
) {
  const flags = await requireManage(userId, data.teacherId)

  // A may be unassigned (dragged from pool directly onto a paired target).
  // B must already be assigned since only assigned solo students are drop targets.
  const [a, b] = await Promise.all([
    findAssignmentByStudentId(data.studentIdA),
    findAssignmentByStudentId(data.studentIdB),
  ])
  if (!b) {
    throw new NotFoundError(
      'Target student must already be assigned to a teacher.',
    )
  }

  // If A has no assignment yet, treat it as a new student joining data.teacherId.
  const candidateA = a
    ? toCandidate(a)
    : { studentId: data.studentIdA, teacherId: data.teacherId, pairId: null }

  const validation = canPairStudents(candidateA, toCandidate(b))
  if (!validation.ok) throw new ConflictError(PAIR_ERROR[validation.reason])

  // Assign A (inserts if new, moves if under a different teacher).
  await assignInternal(data.studentIdA, data.teacherId, flags, userId)

  const pair = await insertPair(data.teacherId)
  await Promise.all([
    setAssignmentPair(data.studentIdA, pair.id),
    setAssignmentPair(b.studentId, pair.id),
  ])
}

export async function unpairStudentService(
  data: UnpairStudentInput,
  userId: string,
) {
  const existing = await findAssignmentByStudentId(data.studentId)
  if (!existing || !existing.pairId) return
  await requireManage(userId, existing.teacherId)
  await dissolvePairIfNeeded(existing.pairId, data.studentId)
}

export async function setIndividualScheduleService(
  data: SetIndividualScheduleInput,
  userId: string,
) {
  const existing = await findAssignmentByStudentId(data.studentId)
  if (!existing) throw new NotFoundError('Discipleship assignment not found.')
  await requireManage(userId, existing.teacherId)
  await setAssignmentAnchor(data.studentId, data.anchorAt)
}

export async function setPairScheduleService(
  data: SetPairScheduleInput,
  userId: string,
) {
  const pair = await findPairById(data.pairId)
  if (!pair) throw new NotFoundError('Discipleship pair not found.')
  await requireManage(userId, pair.teacherId)
  await setPairAnchor(data.pairId, data.anchorAt)
}

export async function setGroupScheduleService(
  data: SetGroupScheduleInput,
  userId: string,
) {
  await requireManage(userId, data.teacherId)
  await upsertGroupAnchor(data.teacherId, data.anchorAt)
}
