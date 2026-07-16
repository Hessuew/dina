import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { listOpenAttendanceForStudent, markPresent } from '@/utils/attendance'
import { Button } from '@/components/ui/button'

const POLL_MS = 20_000

type OpenSession = {
  id: string
  courseId: string
  lessonId: string
  courseTitle: string
  lessonTitle: string | null
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
  const [busyId, setBusyId] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current
    try {
      const result = await listOpenAttendanceForStudent()
      if (requestId !== requestIdRef.current) return
      setSessions(result.sessions as Array<OpenSession>)
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

  return (
    <div className="mb-8 space-y-3">
      {sessions.map((session) => (
        <OpenSessionCard
          key={session.id}
          session={session}
          busy={busyId === session.courseId}
          onPresent={() => void onPresent(session.courseId)}
        />
      ))}
    </div>
  )
}

function OpenSessionCard({
  session,
  busy,
  onPresent,
}: {
  session: OpenSession
  busy: boolean
  onPresent: () => void
}) {
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
          {session.lessonTitle ?? 'Lesson'} · {session.remainingLabel} remaining
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
        {session.alreadyPresent ? (
          <span className="border border-[#C5A059]/40 bg-[#1A1716] px-4 py-2 text-sm text-[#E9D9B4]">
            Present
          </span>
        ) : (
          <Button
            type="button"
            disabled={busy}
            onClick={onPresent}
            className="rounded-none bg-[#C5A059] text-[#141210] hover:bg-[#D4B373]"
          >
            I'm here
          </Button>
        )}
        <Link
          to="/courses/$courseId"
          params={{ courseId: session.courseId }}
          className="text-center text-sm text-[#D4B373] underline-offset-4 hover:underline"
        >
          Open course
        </Link>
      </div>
    </div>
  )
}
