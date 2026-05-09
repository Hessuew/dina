import type { Role } from './types'

export interface EntityPermissions {
  isAdmin: boolean
  isCourseTeacher: boolean
  canEdit: boolean
  canManage: boolean
}

/**
 * Calculates entity permissions for the current user based on their role and relationship to the entity.
 *
 * @param role - The user's role (student, teacher, or admin)
 * @param entity - The entity with teacher IDs (course, lesson, or assignment)
 * @param userId - The current user's ID
 * @returns Permission flags for the user on this entity
 */
export function calculateEntityPermissions(
  role: Role,
  entity: { teacher1Id?: string | null; teacher2Id?: string | null },
  userId: string,
): EntityPermissions {
  const isAdmin = role === 'admin'
  const isCourseTeacher =
    (entity.teacher1Id === userId || entity.teacher2Id === userId) || isAdmin
  const canEdit = role === 'teacher' || role === 'admin'
  const canManage = canEdit && isCourseTeacher

  return { isAdmin, isCourseTeacher, canEdit, canManage }
}
