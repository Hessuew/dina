import { useCachedData } from './useCachedData'
import { getAllTeachers } from '@/utils/courses'

type AllTeachersResponse = Awaited<ReturnType<typeof getAllTeachers>>
type Teacher = AllTeachersResponse['teachers'][number]

type UseAllTeachersResult = {
  teachers: Array<Teacher>
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useAllTeachers(shouldFetch: boolean): UseAllTeachersResult {
  const {
    data: teachers,
    isLoading,
    error,
    refetch,
  } = useCachedData(shouldFetch, getAllTeachers, (result) =>
    'teachers' in result ? result.teachers : [],
  )

  return {
    teachers,
    isLoading,
    error,
    refetch,
  }
}
