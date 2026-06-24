import type { CreateLessonInput, UpdateLessonInput } from '@/schemas/lesson.schema'

export const MAX_LESSONS_PER_COURSE = 3

export type LessonFormData = {
  title: string
  content: string
  scheduledTime: string
  duration: number
  isPublished: boolean
}

export type LessonInitialData = {
  lessonId: string
  title: string
  content: string | null
  scheduledTime: Date | null
  duration: number | null
  isPublished: boolean | null
  orderIndex: number
}

const emptyLessonFormData: LessonFormData = {
  title: '',
  content: '',
  scheduledTime: '',
  duration: 0,
  isPublished: false,
}

function buildLessonSharedInput(value: LessonFormData) {
  return {
    title: value.title,
    content: value.content || undefined,
    scheduledTime: value.scheduledTime ? new Date(value.scheduledTime) : undefined,
    duration: value.duration > 0 ? value.duration : undefined,
    isPublished: value.isPublished,
  }
}

export function buildLessonCreateInput(
  value: LessonFormData,
  courseId: string,
  orderIndex: number,
): CreateLessonInput {
  return { ...buildLessonSharedInput(value), courseId, orderIndex }
}

export function buildLessonUpdateInput(
  value: LessonFormData,
  lessonId: string,
  courseId: string,
): UpdateLessonInput {
  return { ...buildLessonSharedInput(value), lessonId, courseId }
}

export function buildLessonDialogConfig(mode: 'create' | 'edit') {
  const isCreate = mode === 'create'
  return {
    title: isCreate ? 'Create Lesson' : 'Edit Lesson',
    subtitle: isCreate
      ? 'Add a new lesson to this course'
      : 'Update the lesson information',
    submitLabel: isCreate ? 'Create Lesson' : 'Save Changes',
  }
}

export function getLessonInitialValues(
  initialData: LessonInitialData | undefined,
  mode: 'create' | 'edit' | 'delete',
): LessonFormData {
  if (!initialData || mode === 'create') return { ...emptyLessonFormData }
  return {
    title: initialData.title,
    content: initialData.content ?? '',
    scheduledTime: initialData.scheduledTime
      ? new Date(initialData.scheduledTime).toISOString().slice(0, 16)
      : '',
    duration: initialData.duration ?? 0,
    isPublished: initialData.isPublished ?? false,
  }
}
