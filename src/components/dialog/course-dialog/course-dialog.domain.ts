export type CourseFormData = {
  title: string
  description: string
  orderIndex: number
  teacher1Id: string
  teacher2Id: string
  isPublished: boolean
}

export const emptyCourseFormData: CourseFormData = {
  title: '',
  description: '',
  orderIndex: 0,
  teacher1Id: '',
  teacher2Id: '',
  isPublished: false,
}

export type CourseInitialData = {
  courseId: string
  title: string
  description: string
  thumbnailUrl: string | null
  isPublished: boolean
  teacher1Id: string | null
  teacher2Id: string | null
  orderIndex: number
}

export function getInitialValues(
  initialData: CourseInitialData | undefined,
): CourseFormData {
  if (!initialData) return { ...emptyCourseFormData }

  return {
    title: initialData.title,
    description: initialData.description,
    orderIndex: initialData.orderIndex,
    teacher1Id: initialData.teacher1Id ?? '',
    teacher2Id: initialData.teacher2Id ?? '',
    isPublished: initialData.isPublished,
  }
}

type CourseSharedInput = {
  title: string
  description: string
  orderIndex: number
  teacher1Id: string | undefined
  teacher2Id: string | undefined
  isPublished: boolean
}

export type CourseSubmitAction =
  | { kind: 'create'; data: CourseSharedInput }
  | {
      kind: 'update'
      data: CourseSharedInput & {
        courseId: string
        thumbnailUrl: string | undefined
      }
    }
  | { kind: 'none' }

export function buildCourseSubmitAction(
  mode: 'create' | 'edit',
  value: CourseFormData,
  initialData: CourseInitialData | undefined,
  thumbnailUrl: string | null,
): CourseSubmitAction {
  const shared: CourseSharedInput = {
    title: value.title,
    description: value.description,
    orderIndex: value.orderIndex,
    teacher1Id: value.teacher1Id || undefined,
    teacher2Id: value.teacher2Id || undefined,
    isPublished: value.isPublished,
  }

  if (mode === 'create') return { kind: 'create', data: shared }

  if (!initialData) return { kind: 'none' }

  return {
    kind: 'update',
    data: {
      ...shared,
      courseId: initialData.courseId,
      thumbnailUrl: thumbnailUrl || undefined,
    },
  }
}

export type CourseDialogChrome = {
  title: string
  subtitle: string
  submitLabel: string
}

export function getCourseDialogChrome(
  mode: 'create' | 'edit',
): CourseDialogChrome {
  if (mode === 'create') {
    return {
      title: 'Create Course',
      subtitle: 'Add a new course and assign teachers',
      submitLabel: 'Create Course',
    }
  }
  return {
    title: 'Edit Course',
    subtitle: 'Update the course information',
    submitLabel: 'Save Changes',
  }
}

export function getCourseLoadingLabel(
  isUploading: boolean,
): string | undefined {
  return isUploading ? 'Uploading...' : undefined
}

export function isCourseDialogSubmitting(
  isAnyPending: boolean,
  isUploading: boolean,
): boolean {
  return isAnyPending || isUploading
}

export function shouldLoadCourseTeachers(
  open: boolean,
  isAdmin: boolean,
): boolean {
  return open && isAdmin
}

export function extractCreatedCourseId(data: unknown): string | null {
  if (data && typeof data === 'object' && 'course' in data) {
    const course = (data as { course?: { id?: string } }).course
    return course?.id ?? null
  }
  return null
}
