import { useEffect, useState } from 'react'
import { getAllTeachers } from '@/utils/courses'

type Teacher = {
  id: string
  fullName: string
  email: string
}

type UseAllTeachersResult = {
  teachers: Array<Teacher>
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useAllTeachers(shouldFetch: boolean): UseAllTeachersResult {
  const [teachers, setTeachers] = useState<Array<Teacher>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTeachers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await getAllTeachers()
      if ('teachers' in result) {
        setTeachers(result.teachers)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to fetch teachers'),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (shouldFetch && teachers.length === 0 && !isLoading) {
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
