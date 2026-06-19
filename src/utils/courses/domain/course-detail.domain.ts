type CourseEditSource = {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  isPublished: boolean | null
  orderIndex: number | null
}

type CourseTeacherEntry = {
  teacher?: { id: string } | null
}

export type CourseEditData = {
  courseId: string
  title: string
  description: string
  thumbnailUrl: string | null
  isPublished: boolean
  teacher1Id: string | null
  teacher2Id: string | null
  orderIndex: number
}

export function buildCourseEditData(
  course: CourseEditSource,
  courseTeachers: Array<CourseTeacherEntry>,
): CourseEditData {
  return {
    courseId: course.id,
    title: course.title,
    description: course.description || '',
    thumbnailUrl: course.thumbnailUrl,
    isPublished: course.isPublished ?? false,
    teacher1Id: courseTeachers[0]?.teacher?.id || null,
    teacher2Id: courseTeachers[1]?.teacher?.id || null,
    orderIndex: course.orderIndex ?? 0,
  }
}

export function shouldShowMaterials(
  canEdit: boolean,
  materials: Array<{ isPublished: boolean | null }>,
): boolean {
  return canEdit || materials.some((m) => Boolean(m.isPublished))
}

export function getCourseStatus(
  isPublished: boolean | null,
): 'published' | 'draft' {
  return isPublished ? 'published' : 'draft'
}

export function handleDialogDismiss(open: boolean, onClose: () => void): void {
  if (!open) onClose()
}

export function isDialogModeActive<M extends string>(
  isOpen: boolean,
  mode: M,
  target: M,
): boolean {
  return isOpen && mode === target
}

export function buildMediaDialogKey(
  mode: string,
  item: { id: string } | null | undefined,
): string {
  return `${mode}-${item?.id}`
}

export function buildLessonInitialData<
  T extends { id: string },
>(dialogItem: T | null | undefined): (T & { lessonId: string }) | undefined {
  if (!dialogItem) return undefined
  return { ...dialogItem, lessonId: dialogItem.id }
}
