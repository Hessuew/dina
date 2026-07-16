import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type {
  LessonOption,
  OpenSessionView,
} from '@/utils/attendance/domain/course-attendance-ui.domain'
import { pickDefaultLessonId } from '@/utils/attendance/domain/course-attendance-ui.domain'
import {
  closeAttendance,
  getCourseAttendanceState,
  markPresent,
  startOrReopenAttendance,
} from '@/utils/attendance'

const POLL_MS = 20_000

type AttendanceState = {
  role: string
  openSession: OpenSessionView | null
  lessons: Array<LessonOption>
}

function useAttendancePoll(courseId: string) {
  const [state, setState] = useState<AttendanceState | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const requestIdRef = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    try {
      const next = (await getCourseAttendanceState({
        data: { courseId },
      })) as AttendanceState
      if (requestId !== requestIdRef.current) return
      setState(next)
      setSelectedLessonId((prev) =>
        prev
          ? prev
          : pickDefaultLessonId(
              next.lessons,
              next.openSession?.lessonId ?? null,
            ),
      )
    } catch {
      // Poll failures stay silent; next tick retries.
    }
  }, [courseId])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), POLL_MS)
    return () => {
      requestIdRef.current++
      window.clearInterval(id)
    }
  }, [refresh])

  return { state, selectedLessonId, setSelectedLessonId, refresh }
}

function notifySuccess(ref: { current: boolean }, message: string) {
  if (ref.current) toast.success(message)
}

function notifyError(
  ref: { current: boolean },
  error: unknown,
  fallback: string,
) {
  if (!ref.current) return
  toast.error(error instanceof Error ? error.message : fallback)
}

function clearBusy(
  ref: { current: boolean },
  setBusy: (busy: boolean) => void,
) {
  if (ref.current) setBusy(false)
}

function useMountedRef() {
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])
  return mountedRef
}

export function useCourseAttendance(courseId: string) {
  const { state, selectedLessonId, setSelectedLessonId, refresh } =
    useAttendancePoll(courseId)
  const [busy, setBusy] = useState(false)
  const mountedRef = useMountedRef()

  const run = useCallback(
    async (action: () => Promise<void>, success: string, fail: string) => {
      setBusy(true)
      try {
        await action()
        notifySuccess(mountedRef, success)
        await refresh()
      } catch (error) {
        notifyError(mountedRef, error, fail)
      } finally {
        clearBusy(mountedRef, setBusy)
      }
    },
    [refresh],
  )

  const start = useCallback(async () => {
    if (!selectedLessonId) {
      toast.error('Select a lesson first')
      return
    }
    await run(
      () =>
        startOrReopenAttendance({
          data: { courseId, lessonId: selectedLessonId },
        }).then(() => undefined),
      'Attendance window open for 10 minutes',
      'Could not open',
    )
  }, [courseId, selectedLessonId, run])

  const close = useCallback(async () => {
    await run(
      () => closeAttendance({ data: { courseId } }).then(() => undefined),
      'Attendance window closed',
      'Could not close',
    )
  }, [courseId, run])

  const present = useCallback(async () => {
    await run(
      () => markPresent({ data: { courseId } }).then(() => undefined),
      "You're marked present",
      'Could not check in',
    )
  }, [courseId, run])

  return {
    state,
    selectedLessonId,
    setSelectedLessonId,
    busy,
    start,
    close,
    present,
  }
}
