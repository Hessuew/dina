import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SquareArrowOutUpRight,
  X,
} from 'lucide-react'
import type { RefObject } from 'react'
import type { EnrollmentWithEvaluation } from '@/utils/enrolment/domain/enrolment.domain'
import type { EvaluationWithAuthor } from '@/utils/enrolment/repository/enrolment.repository'
import {
  formatEvaluationSummary,
  formatScore,
  reduceScoreKey,
} from '@/utils/enrolment/domain/evaluation.domain'
import { EnrollmentDetails } from '@/components/enrollment/EnrollmentDetails'
import { useMutation } from '@/hooks/useMutation'
import { setEvaluationNote, setEvaluationScore } from '@/utils/enrolment'
import { cn } from '@/lib/utils'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const POSITIVE_SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const NEGATIVE_SCORES = [-1, -2, -3, -4, -5, -6, -7, -8, -9]

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
  )
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === 'saving')
    return <Loader2 className="size-3.5 animate-spin text-[#8E816D]" />
  if (state === 'saved') return <Check className="size-3.5 text-emerald-400" />
  if (state === 'error') return <X className="size-3.5 text-red-400" />
  return <span className="size-3.5" />
}

function ScoreButton({
  value,
  active,
  onClick,
}: {
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-none border text-sm tabular-nums transition-colors',
        active
          ? 'border-[#C5A059] bg-[#C5A059]/20 text-[#E9D9B4]'
          : 'border-white/10 bg-[#1A1716] text-[#AFA28F] hover:border-white/25 hover:text-[#F8F4EC]',
      )}
    >
      {value > 0 ? `+${value}` : value}
    </button>
  )
}

/**
 * Note field for the current evaluator, with debounced autosave (~400ms)
 * and a flush on unmount so a pending note isn't lost when navigating away.
 * Keyed by enrollment id by the parent so it re-initialises per applicant.
 */
function NoteEditor({
  initialNote,
  onSave,
  textareaRef,
}: {
  initialNote: string
  onSave: (note: string) => Promise<void>
  textareaRef: RefObject<HTMLTextAreaElement | null>
}) {
  const [value, setValue] = useState(initialNote)
  const [state, setState] = useState<SaveState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef(initialNote)
  const dirtyRef = useRef(false)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  // Flush a pending save when navigating away / closing.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (dirtyRef.current) {
        dirtyRef.current = false
        void onSaveRef.current(latestRef.current)
      }
    }
  }, [])

  const handleChange = (next: string) => {
    setValue(next)
    latestRef.current = next
    dirtyRef.current = true
    setState('saving')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      dirtyRef.current = false
      try {
        await onSaveRef.current(next)
        setState('saved')
      } catch {
        dirtyRef.current = true
        setState('error')
      }
    }, 400)
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[0.62rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
          Your note
        </span>
        <SaveStatus state={state} />
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        rows={2}
        placeholder="Optional note… (Enter to finish, Shift+Enter for newline)"
        className="w-full resize-none rounded-none border border-white/10 bg-[#1A1716] px-3 py-2 text-sm text-[#F8F4EC] placeholder:text-[#8E816D] focus-visible:border-[#C5A059]/40 focus-visible:outline-none"
      />
    </div>
  )
}

type EvaluationOverlayProps = {
  enrollment: EnrollmentWithEvaluation
  evaluations: Array<EvaluationWithAuthor>
  isAdmin: boolean
  userId: string
  position: number
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onLocalEvaluation: (
    enrollmentId: string,
    patch: { score?: number | null; note?: string },
  ) => void
}

export function EvaluationOverlay({
  enrollment,
  evaluations,
  isAdmin,
  userId,
  position,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onLocalEvaluation,
}: EvaluationOverlayProps) {
  const scoreFn = useServerFn(setEvaluationScore)
  const noteFn = useServerFn(setEvaluationNote)

  const scoreMutation = useMutation({
    fn: scoreFn,
    onError: () => {
      onLocalEvaluation(enrollment.id, { score: pendingPrevScoreRef.current })
      toast.error('Failed to save score')
    },
  })
  const noteMutation = useMutation({ fn: noteFn })

  const noteRef = useRef<HTMLTextAreaElement>(null)
  const pendingPrevScoreRef = useRef<number | null>(null)
  const [negativeArmed, setNegativeArmed] = useState(false)

  const myEvaluation = evaluations.find((e) => e.evaluatorId === userId)
  const myScore = myEvaluation?.score ?? null
  const myNote = myEvaluation?.note ?? ''

  const otherNotes = evaluations.filter(
    (e) => e.evaluatorId !== userId && e.note && e.note.trim().length > 0,
  )

  const liveSum = evaluations.reduce((acc, e) => acc + (e.score ?? 0), 0)
  const liveCount = evaluations.length

  const saveScore = useCallback(
    (score: number | null) => {
      pendingPrevScoreRef.current = myScore
      onLocalEvaluation(enrollment.id, { score })
      void scoreMutation.mutate({
        data: { enrollmentId: enrollment.id, score },
      })
    },
    [enrollment.id, myScore, onLocalEvaluation, scoreMutation],
  )

  const handleScoreButton = (value: number) => {
    setNegativeArmed(false)
    saveScore(value === myScore ? null : value)
  }

  const saveNote = useCallback(
    async (note: string) => {
      onLocalEvaluation(enrollment.id, { note })
      await noteMutation.mutate({ data: { enrollmentId: enrollment.id, note } })
    },
    [enrollment.id, onLocalEvaluation, noteMutation],
  )

  // Prevent the page behind from scrolling while the overlay is open.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Keyboard: scoring, navigation, close. Ignored while typing in the note.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setNegativeArmed(false)
        void onNext()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setNegativeArmed(false)
        void onPrev()
        return
      }
      if (event.key === 'Escape') {
        if (negativeArmed) {
          setNegativeArmed(false)
        } else {
          onClose()
        }
        return
      }
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        const el = noteRef.current
        if (el) {
          el.focus()
          const end = el.value.length
          el.setSelectionRange(end, end)
        }
        return
      }

      const result = reduceScoreKey(myScore, event.key, negativeArmed)
      if (!result.handled) return
      event.preventDefault()
      setNegativeArmed(result.negativeArmed)
      if (result.changed) saveScore(result.score)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [myScore, negativeArmed, onNext, onPrev, onClose, saveScore])

  const scoreState: SaveState = scoreMutation.isPending
    ? 'saving'
    : scoreMutation.status === 'success'
      ? 'saved'
      : scoreMutation.status === 'error'
        ? 'error'
        : 'idle'

  return (
    <div className="fixed inset-0 z-70 flex flex-col bg-[#0B0B0C]/96 pt-10 backdrop-blur-sm">
      {/* Evaluation panel — sits on top of the application content */}
      <div className="border-b border-white/10 bg-[#151515]/95">
        <div className="mx-auto w-full max-w-5xl px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
                {enrollment.fullLegalName}
              </h2>
              <p className="mt-1 text-[0.66rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Evaluating #{position} · Total{' '}
                {formatEvaluationSummary(liveSum, liveCount)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/enrollments/$enrollmentId"
                params={{ enrollmentId: enrollment.id }}
                className="inline-flex items-center gap-1.5 text-[0.7rem] tracking-[0.12em] text-[#AFA28F] uppercase hover:text-[#F8F4EC]"
              >
                <SquareArrowOutUpRight className="size-3.5" />
                Full record
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-none border border-white/10 text-[#AFA28F] hover:border-white/25 hover:text-[#F8F4EC]"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Score pad */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                {POSITIVE_SCORES.map((value) => (
                  <ScoreButton
                    key={value}
                    value={value}
                    active={myScore === value}
                    onClick={() => handleScoreButton(value)}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                {NEGATIVE_SCORES.map((value) => (
                  <ScoreButton
                    key={value}
                    value={value}
                    active={myScore === value}
                    onClick={() => handleScoreButton(value)}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 pl-2">
              <span className="text-[0.62rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Your score
              </span>
              <span className="font-serif text-2xl text-[#E9D9B4] tabular-nums">
                {myScore === null ? '—' : formatScore(myScore)}
              </span>
              <SaveStatus state={scoreState} />
            </div>
            <div className="flex-1 pl-8">
              <NoteEditor
                key={enrollment.id}
                initialNote={myNote}
                onSave={saveNote}
                textareaRef={noteRef}
              />
            </div>
          </div>

          {/* Other evaluators' notes */}
          {otherNotes.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-white/8 pt-3">
              {otherNotes.map((note) => (
                <div key={note.evaluatorId} className="text-sm">
                  <span className="text-[0.7rem] font-medium tracking-widest text-[#8E816D] uppercase">
                    {note.evaluatorName}
                    {note.score !== null && (
                      <span className="ml-2 text-[#C5A059]">
                        {formatScore(note.score)}
                      </span>
                    )}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap text-[#D6CCBE]">
                    {note.note}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Application content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-5xl">
          <EnrollmentDetails
            enrollment={enrollment}
            isAdmin={isAdmin}
            essaysAside
          />
        </div>
      </div>

      {/* Prev / next arrows */}
      <button
        type="button"
        onClick={() => onPrev()}
        disabled={!hasPrev}
        aria-label="Previous"
        className={cn(
          'absolute top-1/4 left-1/10 flex size-11 -translate-y-1/2 items-center justify-center rounded-none border border-white/10 bg-[#1A1716] text-[#AFA28F] transition-colors hover:border-[#C5A059]/40 hover:text-[#F8F4EC]',
          !hasPrev && 'pointer-events-none opacity-25',
        )}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => onNext()}
        disabled={!hasNext}
        aria-label="Next"
        className={cn(
          'absolute top-1/4 right-1/10 flex size-11 -translate-y-1/2 items-center justify-center rounded-none border border-white/10 bg-[#1A1716] text-[#AFA28F] transition-colors hover:border-[#C5A059]/40 hover:text-[#F8F4EC]',
          !hasNext && 'pointer-events-none opacity-25',
        )}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
