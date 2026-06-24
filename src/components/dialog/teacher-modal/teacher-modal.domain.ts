import type { TeacherWithCourse } from '@/types/teacher'
import { GEM_IMAGE_MAP } from '@/utils/gems'

export type TeacherGemImage = {
  url: string
  alt: string
}

export type TeacherModalViewModel = {
  initials: string
  gemImage: TeacherGemImage | null
}

export function getTeacherInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

export function resolveTeacherModalGemImage(
  gemstone: string | null,
): TeacherGemImage | null {
  if (!gemstone) return null
  const url = GEM_IMAGE_MAP[gemstone]
  return url ? { url, alt: gemstone } : null
}

export function buildTeacherModalViewModel(
  teacher: TeacherWithCourse,
): TeacherModalViewModel {
  return {
    initials: getTeacherInitials(teacher.fullName),
    gemImage: resolveTeacherModalGemImage(teacher.gemstone),
  }
}
