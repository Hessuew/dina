import { useCachedData } from './useCachedData'
import type { StudentWithStats } from '@/types/student'
import { getStudents } from '@/utils/students'

type UseStudentsResult = {
  students: Array<StudentWithStats>
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useStudents(shouldFetch: boolean): UseStudentsResult {
  const {
    data: students,
    isLoading,
    error,
    refetch,
  } = useCachedData(shouldFetch, getStudents, (result) => result.students)

  return {
    students,
    isLoading,
    error,
    refetch,
  }
}
