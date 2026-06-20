export type LessonRowView = {
  isPublished: boolean
  showContent: boolean
  indexLabel: string
  showStatusChip: boolean
  statusChipVariant: 'published' | 'draft'
  showContentText: boolean
  showMeta: boolean
}

export function resolveLessonRowView(input: {
  lesson: { isPublished: boolean | null; content: string | null }
  index: number
  permissions: { canEdit: boolean; isCourseTeacher: boolean }
}): LessonRowView {
  const { lesson, index, permissions } = input
  const isPublished = lesson.isPublished ?? false
  const showContent = isPublished || permissions.canEdit

  return {
    isPublished,
    showContent,
    indexLabel: String(index + 1).padStart(2, '0'),
    showStatusChip: permissions.canEdit && permissions.isCourseTeacher,
    statusChipVariant: isPublished ? 'published' : 'draft',
    showContentText: showContent && Boolean(lesson.content),
    showMeta: showContent,
  }
}
