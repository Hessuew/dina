import { useCachedData } from './useCachedData'
import type { TeacherWithCourse } from '@/types/teacher'
import { getTeachers } from '@/utils/teachers/teachers'

type UseTeachersResult = {
  teachers: Array<TeacherWithCourse>
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useTeachers(shouldFetch: boolean): UseTeachersResult {
  const {
    data: teachers,
    isLoading,
    error,
    refetch,
  } = useCachedData(shouldFetch, getTeachers, (result) => result.teachers)

  return {
    teachers,
    isLoading,
    error,
    refetch,
  }
}
