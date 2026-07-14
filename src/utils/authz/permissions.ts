import type { Role } from './types'

export interface EntityPermissions {
  isAdmin: boolean
  isCourseTeacher: boolean
  canEdit: boolean
  canManage: boolean
}

export type EntityTeacherRef = {
  /** Prefer full course_teachers set when available (order-independent). */
  teacherIds?: Array<string | null | undefined>
  teacher1Id?: string | null
  teacher2Id?: string | null
}

function resolveTeacherIds(entity: EntityTeacherRef): Array<string> {
  const raw = entity.teacherIds ?? [entity.teacher1Id, entity.teacher2Id]
  return raw.filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  )
}

/**
 * Calculates entity permissions for the current user based on their role and relationship to the entity.
 *
 * @param role - The user's role (student, teacher, or admin)
 * @param entity - Teachers on the entity: `teacherIds` (preferred) or legacy teacher1/2 slots
 * @param userId - The current user's ID
 * @returns Permission flags for the user on this entity
 */
export function calculateEntityPermissions(
  role: Role,
  entity: EntityTeacherRef,
  userId: string,
): EntityPermissions {
  const isAdmin = role === 'admin'
  const isCourseTeacher = isAdmin || resolveTeacherIds(entity).includes(userId)
  const canEdit = role === 'teacher' || role === 'admin'
  const canManage = canEdit && isCourseTeacher

  return { isAdmin, isCourseTeacher, canEdit, canManage }
}
