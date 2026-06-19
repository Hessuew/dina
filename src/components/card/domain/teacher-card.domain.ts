import type { TeacherWithCourse } from '@/types/teacher'
import { GEM_IMAGE_MAP } from '@/utils/gems'

export function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase()
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

export const COURSE_ORDER_THEMES: Record<number, string> = {
  1: 'Ground',
  2: 'Foundation',
  3: 'Walls',
  4: 'Framing',
  5: 'Interior',
  6: 'Roof',
}

export type TeacherCardGemImage = {
  url: string
  alt: string
}

export type TeacherCardViewModel = {
  initials: string
  topLabel: string | undefined
  gemImage: TeacherCardGemImage | null
}

function resolveTopLabel(teacher: TeacherWithCourse): string | undefined {
  const courseTheme =
    teacher.course?.orderIndex != null
      ? COURSE_ORDER_THEMES[teacher.course.orderIndex]
      : undefined
  return courseTheme ?? teacher.lecturerTitle ?? undefined
}

function resolveGemImage(gemstone: string | null): TeacherCardGemImage | null {
  if (!gemstone) return null
  const url = GEM_IMAGE_MAP[gemstone]
  return url ? { url, alt: gemstone } : null
}

export function buildTeacherCardViewModel(
  teacher: TeacherWithCourse,
): TeacherCardViewModel {
  return {
    initials: getInitials(teacher.fullName),
    topLabel: resolveTopLabel(teacher),
    gemImage: resolveGemImage(teacher.gemstone),
  }
}
