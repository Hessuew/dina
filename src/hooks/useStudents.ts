import { useEffect, useState } from 'react'
import type { StudentWithStats } from '@/types/student'
import { getStudents } from '@/utils/students'

const CACHE_DURATION = 5 * 60 * 1000

type UseStudentsResult = {
  students: Array<StudentWithStats>
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useStudents(shouldFetch: boolean): UseStudentsResult {
  const [students, setStudents] = useState<Array<StudentWithStats>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null)

  const fetchStudents = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await getStudents()
      setStudents(result.students)
      setLastFetchTime(Date.now())
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch students'),
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
      fetchStudents()
    }
  }, [shouldFetch])

  return {
    students,
    isLoading,
    error,
    refetch: fetchStudents,
  }
}
