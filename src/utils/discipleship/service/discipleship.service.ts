import { resolveAdminOrTeacherAccess, withRequestCache } from '@/utils/authz'
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
import type { PairValidation } from '@/utils/discipleship/domain/discipleship-pairing.domain'
import type {
  BoardAssignment,
  BoardGroup,
  BoardPair,
} from '@/utils/discipleship/domain/discipleship-board.domain'
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
  insertAssignment,
  insertPair,
  setAssignmentAnchor,
  setAssignmentPair,
  setPairAnchor,
  updateAssignmentTeacher,
  upsertGroupAnchor,
} from '@/utils/discipleship/repository'
import type {
  AssignStudentToTeacherInput,
  PairStudentsInput,
  SetGroupScheduleInput,
  SetIndividualScheduleInput,
  SetPairScheduleInput,
  UnassignStudentInput,
  UnpairStudentInput,
} from '@/schemas/discipleship.schema'

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
  return withRequestCache(async () => {
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
  })
}

export async function assignStudentToTeacherService(
  data: AssignStudentToTeacherInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const flags = await requireManage(userId, data.teacherId)
    await assignInternal(data.studentId, data.teacherId, flags, userId)
  })
}

export async function unassignStudentService(
  data: UnassignStudentInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const existing = await findAssignmentByStudentId(data.studentId)
    if (!existing) return
    await requireManage(userId, existing.teacherId)
    await dissolvePairIfNeeded(existing.pairId, data.studentId)
    await deleteAssignmentByStudentId(data.studentId)
  })
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
  return withRequestCache(async () => {
    const flags = await requireManage(userId, data.teacherId)

    // Validate both assignments exist and can be paired before mutating.
    const [a, b] = await Promise.all([
      findAssignmentByStudentId(data.studentIdA),
      findAssignmentByStudentId(data.studentIdB),
    ])
    if (!a || !b) {
      throw new NotFoundError('Both students must be assigned to this teacher.')
    }

    const validation = canPairStudents(toCandidate(a), toCandidate(b))
    if (!validation.ok) throw new ConflictError(PAIR_ERROR[validation.reason])

    // Validation passed — safe to move A to teacherId if needed, then pair.
    await assignInternal(data.studentIdA, data.teacherId, flags, userId)

    const pair = await insertPair(data.teacherId)
    await Promise.all([
      setAssignmentPair(a.studentId, pair.id),
      setAssignmentPair(b.studentId, pair.id),
    ])
  })
}

export async function unpairStudentService(
  data: UnpairStudentInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const existing = await findAssignmentByStudentId(data.studentId)
    if (!existing || !existing.pairId) return
    await requireManage(userId, existing.teacherId)
    await dissolvePairIfNeeded(existing.pairId, data.studentId)
  })
}

export async function setIndividualScheduleService(
  data: SetIndividualScheduleInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const existing = await findAssignmentByStudentId(data.studentId)
    if (!existing) throw new NotFoundError('Discipleship assignment not found.')
    await requireManage(userId, existing.teacherId)
    await setAssignmentAnchor(data.studentId, data.anchorAt)
  })
}

export async function setPairScheduleService(
  data: SetPairScheduleInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const pair = await findPairById(data.pairId)
    if (!pair) throw new NotFoundError('Discipleship pair not found.')
    await requireManage(userId, pair.teacherId)
    await setPairAnchor(data.pairId, data.anchorAt)
  })
}

export async function setGroupScheduleService(
  data: SetGroupScheduleInput,
  userId: string,
) {
  return withRequestCache(async () => {
    await requireManage(userId, data.teacherId)
    await upsertGroupAnchor(data.teacherId, data.anchorAt)
  })
}
