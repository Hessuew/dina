import { useEffect, useState } from 'react'
import type { TeacherWithCourses } from '@/types/teacher'
import { getTeachers } from '@/utils/teachers'

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

type UseTeachersResult = {
  teachers: Array<TeacherWithCourses>
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useTeachers(shouldFetch: boolean): UseTeachersResult {
  const [teachers, setTeachers] = useState<Array<TeacherWithCourses>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null)

  const fetchTeachers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await getTeachers()
      setTeachers(result.teachers)
      setLastFetchTime(Date.now())
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch teachers'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!shouldFetch) return

    const now = Date.now()
    const isStale = !lastFetchTime || now - lastFetchTime > CACHE_DURATION

    if (isStale && !isLoading) {
      fetchTeachers()
    }
  }, [shouldFetch])

  return {
    teachers,
    isLoading,
    error,
    refetch: fetchTeachers,
  }
}
