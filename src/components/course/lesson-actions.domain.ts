export type LessonActionsView = {
  canManage: boolean
  showCompletedBadge: boolean
  showOpenButton: boolean
}

export function resolveLessonActionsView(input: {
  role: 'student' | 'teacher' | 'admin'
  isPublished: boolean
  isCompleted: boolean
  permissions: { canEdit: boolean; isCourseTeacher: boolean }
}): LessonActionsView {
  const { role, isPublished, isCompleted, permissions } = input
  const isStudentPublished = role === 'student' && isPublished

  return {
    canManage: permissions.canEdit && permissions.isCourseTeacher,
    showCompletedBadge: isStudentPublished && isCompleted,
    showOpenButton: isStudentPublished && !isCompleted,
  }
}
