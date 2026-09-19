import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { listOpenAttendanceForStudent, markPresent } from '@/utils/attendance'
import { formatRemaining } from '@/utils/attendance/domain/attendance-window.domain'
import { useServerCountdown } from '@/hooks/useServerCountdown'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'

const POLL_MS = 20_000

type OpenSession = {
  id: string
  courseId: string
  lessonId: string
  courseTitle: string
  lessonTitle: string | null
  closesAt: Date | string | null
  remainingLabel: string | null
  alreadyPresent: boolean
}

function showPresentSuccess(mounted: { current: boolean }) {
  if (mounted.current) toast.success("You're marked present")
}

function showPresentError(mounted: { current: boolean }, error: unknown) {
  if (!mounted.current) return
  toast.error(error instanceof Error ? error.message : 'Could not check in')
}

function clearBusy(mounted: { current: boolean }, clear: () => void) {
  if (mounted.current) clear()
}

export function OpenAttendanceBanner() {
  const [sessions, setSessions] = useState<Array<OpenSession>>([])
  const [serverNow, setServerNow] = useState<Date | string>(() => new Date())
  const [busyId, setBusyId] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    try {
      const result = await listOpenAttendanceForStudent()
      if (requestId !== requestIdRef.current) return
      setSessions(result.sessions as Array<OpenSession>)
      if (result.serverNow) setServerNow(result.serverNow as Date | string)
    } catch {
      // silent poll
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void refresh()
    const id = window.setInterval(() => void refresh(), POLL_MS)
    return () => {
      mountedRef.current = false
      requestIdRef.current++
      window.clearInterval(id)
    }
  }, [refresh])

  const onPresent = useCallback(
    async (courseId: string) => {
      setBusyId(courseId)
      try {
        await markPresent({ data: { courseId } })
        showPresentSuccess(mountedRef)
        await refresh()
      } catch (error) {
        showPresentError(mountedRef, error)
      } finally {
        clearBusy(mountedRef, () => setBusyId(null))
      }
    },
    [refresh],
  )

  if (sessions.length === 0) return null

  const cards = sessions.map((session) => (
    <OpenSessionCard
      key={session.id}
      session={session}
      serverNow={serverNow}
      busy={busyId === session.courseId}
      onPresent={() => void onPresent(session.courseId)}
    />
  ))

  return <div className="mb-8 space-y-3">{cards}</div>
}

function OpenSessionCard({
  session,
  serverNow,
  busy,
  onPresent,
}: {
  session: OpenSession
  serverNow: Date | string
  busy: boolean
  onPresent: () => void
}) {
  const remainingLabel = useOpenSessionRemaining(session.closesAt, serverNow)
  if (!remainingLabel) return null
  if (session.alreadyPresent) {
    return (
      <PresentSessionCard
        courseId={session.courseId}
        courseTitle={session.courseTitle}
        lessonTitle={session.lessonTitle}
        remainingLabel={remainingLabel}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 border-2 border-[#C5A059] bg-[#2A2118] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[0.65rem] font-medium tracking-[0.22em] text-[#C5A059] uppercase">
          Live attendance
        </p>
        <p className="mt-1 font-serif text-xl text-[#F8F4EC]">
          {session.courseTitle}
        </p>
        <p className="text-sm text-[#E9D9B4]">
          {sessionLessonTitle(session.lessonTitle)} · {remainingLabel} remaining
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          type="button"
          theme="dark"
          disabled={busy}
          onClick={onPresent}
          className="rounded-none"
        >
          Mark present
        </Button>
        <OpenCourseButton courseId={session.courseId} />
      </div>
    </div>
  )
}

function useOpenSessionRemaining(
  closesAt: Date | string | null,
  serverNow: Date | string,
) {
  const countdown = useServerCountdown(closesAt ?? new Date(0), serverNow)
  if (!closesAt) return null
  if (countdown.isExpired) return null
  return formatRemaining(countdown.remainingMs)
}

function sessionLessonTitle(title: string | null) {
  return title ?? 'Lesson'
}

function PresentSessionCard({
  courseId,
  courseTitle,
  lessonTitle,
  remainingLabel,
}: {
  courseId: string
  courseTitle: string
  lessonTitle: string | null
  remainingLabel: string
}) {
  return (
    <div className="flex flex-col gap-4 border border-[#C5A059]/50 bg-[#1A1716] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[0.65rem] font-medium tracking-[0.22em] text-[#C5A059] uppercase">
          Attendance
        </p>
        <p className="mt-1 font-serif text-xl text-[#F8F4EC]">
          You're marked present
        </p>
        <p className="mt-1 text-sm text-[#CFC6B7]">
          {courseTitle}
          {lessonTitle ? ` · ${lessonTitle}` : ''} · {remainingLabel} left
        </p>
      </div>
      <OpenCourseButton courseId={courseId} />
    </div>
  )
}

function OpenCourseButton({ courseId }: { courseId: string }) {
  return (
    <ButtonLink
      to="/courses/$courseId"
      params={{ courseId }}
      theme="dark"
      className="rounded-none"
    >
      Open course
    </ButtonLink>
  )
}
