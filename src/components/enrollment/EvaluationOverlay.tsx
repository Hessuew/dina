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
import type {
  AdmissionCategory,
  EvaluationScore,
} from '@/utils/enrolment/domain/evaluation.domain'
import {
  ADMISSION_CATEGORY_OPTIONS,
  EVALUATION_SCORES,
  EVALUATION_SCORE_LABELS,
  formatScore,
  scoreRequiresAdmissionCategory,
} from '@/utils/enrolment/domain/evaluation.domain'
import { EnrollmentDetails } from '@/components/enrollment/EnrollmentDetails'
import { useEvaluationKeyboard } from '@/hooks/useEvaluationKeyboard'
import { useMutation } from '@/hooks/useMutation'
import {
  setEvaluationAdmissionCategory,
  setEvaluationNote,
  setEvaluationScore,
} from '@/utils/enrolment'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function toSaveState(mutation: {
  isPending: boolean
  status: 'idle' | 'pending' | 'success' | 'error'
}): SaveState {
  if (mutation.isPending) return 'saving'
  if (mutation.status === 'success') return 'saved'
  if (mutation.status === 'error') return 'error'
  return 'idle'
}

function formatAdmissionCategory(category: AdmissionCategory): string {
  return (
    ADMISSION_CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.label ?? category
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
  value: EvaluationScore
  active: boolean
  onClick: () => void
}) {
  const label = EVALUATION_SCORE_LABELS[value]
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={`${value}: ${label}`}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-none border text-sm tabular-nums transition-colors',
              active
                ? 'border-[#C5A059] bg-[#C5A059]/20 text-[#E9D9B4]'
                : 'border-white/10 bg-[#1A1716] text-[#AFA28F] hover:border-white/25 hover:text-[#F8F4EC]',
            )}
          >
            {value}
          </button>
        }
      />
      <TooltipContent className="bg-[#F8F4EC] text-[#1C1815]">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function AdmissionCategoryButton({
  category,
  shortcut,
  label,
  active,
  disabled,
  onClick,
}: {
  category: AdmissionCategory
  shortcut: string
  label: string
  active: boolean
  disabled: boolean
  onClick: (category: AdmissionCategory) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            onClick={() => onClick(category)}
            aria-label={`${shortcut}: ${label}`}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-none border font-serif text-base transition-colors',
              active
                ? 'border-[#C5A059] bg-[#C5A059]/20 text-[#E9D9B4]'
                : 'border-white/10 bg-[#1A1716] text-[#AFA28F] hover:border-white/25 hover:text-[#F8F4EC]',
              disabled &&
                'pointer-events-none border-white/5 bg-[#111111] text-[#5F574D] opacity-55',
            )}
          >
            {shortcut}
          </button>
        }
      />
      <TooltipContent className="bg-[#F8F4EC] text-[#1C1815]">
        {label}
      </TooltipContent>
    </Tooltip>
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
  // Best-effort: if the network request fails on unmount there is no lifecycle
  // to surface the error, so we log it rather than swallow it silently.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (dirtyRef.current) {
        dirtyRef.current = false
        onSaveRef.current(latestRef.current).catch(console.error)
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
      try {
        await onSaveRef.current(next)
        dirtyRef.current = false
        setState('saved')
      } catch {
        setState('error')
        // dirtyRef stays true → unmount flush will retry
      }
    }, 400)
  }

  return (
    <div>
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
      <div className="mt-1 flex justify-end">
        <SaveStatus state={state} />
      </div>
    </div>
  )
}

type EvaluationOverlayProps = {
  enrollment: EnrollmentWithEvaluation
  evaluations: Array<EvaluationWithAuthor>
  isAdmin: boolean
  userId: string
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
  onLocalEvaluation: (
    enrollmentId: string,
    patch: {
      score?: number | null
      admissionCategory?: AdmissionCategory | null
      note?: string
    },
  ) => void
}

export function EvaluationOverlay({
  enrollment,
  evaluations,
  isAdmin,
  userId,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onLocalEvaluation,
}: EvaluationOverlayProps) {
  const scoreFn = useServerFn(setEvaluationScore)
  const categoryFn = useServerFn(setEvaluationAdmissionCategory)
  const noteFn = useServerFn(setEvaluationNote)

  const scoreMutation = useMutation({
    fn: scoreFn,
    onError: () => {
      onLocalEvaluation(enrollment.id, {
        score: pendingPrevScoreRef.current,
        admissionCategory: pendingPrevAdmissionCategoryRef.current,
      })
      toast.error('Failed to save score')
    },
  })
  const categoryMutation = useMutation({
    fn: categoryFn,
    onError: () => {
      onLocalEvaluation(enrollment.id, {
        admissionCategory: pendingPrevAdmissionCategoryRef.current,
      })
      toast.error('Failed to save category')
    },
  })
  const noteMutation = useMutation({ fn: noteFn })

  const noteRef = useRef<HTMLTextAreaElement>(null)
  const pendingPrevScoreRef = useRef<number | null>(null)
  const pendingPrevAdmissionCategoryRef = useRef<AdmissionCategory | null>(null)

  const myEvaluation = evaluations.find((e) => e.evaluatorId === userId)
  const myScore = myEvaluation?.score ?? null
  const myNote = myEvaluation?.note ?? ''
  const myAdmissionCategory = myEvaluation?.admissionCategory ?? null
  const admissionCategoryEnabled = scoreRequiresAdmissionCategory(myScore)
  const admissionCategoryMissing =
    admissionCategoryEnabled && myAdmissionCategory === null
  const evaluationTotal = evaluations.reduce(
    (sum, evaluation) => sum + (evaluation.score ?? 0),
    0,
  )
  const evaluationCount = evaluations.filter(
    (evaluation) => evaluation.score !== null,
  ).length

  const otherNotes = evaluations.filter(
    (e) => e.evaluatorId !== userId && e.note && e.note.trim().length > 0,
  )

  const saveScore = useCallback(
    (score: number | null) => {
      pendingPrevScoreRef.current = myScore
      pendingPrevAdmissionCategoryRef.current = myAdmissionCategory
      onLocalEvaluation(enrollment.id, {
        score,
        ...(!score || score < 3 ? { admissionCategory: null } : {}),
      })
      void scoreMutation.mutate({
        data: { enrollmentId: enrollment.id, score },
      })
    },
    [
      enrollment.id,
      myAdmissionCategory,
      myScore,
      onLocalEvaluation,
      scoreMutation,
    ],
  )

  const saveAdmissionCategory = useCallback(
    (admissionCategory: AdmissionCategory) => {
      if (myScore !== 3 && myScore !== 4) return
      pendingPrevAdmissionCategoryRef.current = myAdmissionCategory
      onLocalEvaluation(enrollment.id, { admissionCategory })
      void categoryMutation.mutate({
        data: {
          enrollmentId: enrollment.id,
          score: myScore,
          admissionCategory,
        },
      })
    },
    [
      categoryMutation,
      enrollment.id,
      myAdmissionCategory,
      myScore,
      onLocalEvaluation,
    ],
  )

  const handleScoreButton = (value: EvaluationScore) => {
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
  useEvaluationKeyboard({
    myScore,
    admissionCategoryEnabled,
    noteRef,
    onNext,
    onPrev,
    onClose,
    saveScore,
    saveAdmissionCategory,
  })

  const scoreState = toSaveState(scoreMutation)
  const categoryState = toSaveState(categoryMutation)

  return (
    <div className="fixed inset-0 z-70 flex flex-col bg-[#0B0B0C]/96 pt-10 backdrop-blur-sm">
      {/* Evaluation panel — sits on top of the application content */}
      <div className="border-b border-white/10 bg-[#151515]/95">
        <div className="mx-auto w-full max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
                {enrollment.fullLegalName}
              </h2>
              {evaluations.filter((e) => e.evaluatorId !== userId).length >
                0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {evaluations
                    .filter((e) => e.evaluatorId !== userId)
                    .map((e) => (
                      <span
                        key={e.evaluatorId}
                        className="text-sm text-[#AFA28F]"
                      >
                        {e.evaluatorName}:{' '}
                        <span className="font-serif text-lg font-medium text-[#E9D9B4]">
                          {e.score !== null ? formatScore(e.score) : '—'}
                        </span>
                      </span>
                    ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
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

          {/* Compact control strip */}
          <div className="mt-3 flex items-start gap-4">
            {/* Column 1: score buttons (row 1) + category buttons (row 2) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1">
                {EVALUATION_SCORES.map((value) => (
                  <ScoreButton
                    key={value}
                    value={value}
                    active={myScore === value}
                    onClick={() => handleScoreButton(value)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {ADMISSION_CATEGORY_OPTIONS.map((option) => (
                  <AdmissionCategoryButton
                    key={option.value}
                    category={option.value}
                    shortcut={option.shortcut}
                    label={option.label}
                    active={myAdmissionCategory === option.value}
                    disabled={!admissionCategoryEnabled}
                    onClick={saveAdmissionCategory}
                  />
                ))}
                <span
                  className={cn(
                    'text-[0.62rem] font-medium tracking-[0.18em] uppercase',
                    admissionCategoryMissing
                      ? 'text-[#C5A059]'
                      : 'text-[#8E816D]',
                  )}
                >
                  Category
                </span>
                <SaveStatus state={categoryState} />
              </div>
            </div>
            {/* Column 2: total score */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[0.62rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
                Total score
              </span>
              <span className="font-serif text-2xl text-[#E9D9B4] tabular-nums">
                {evaluationCount === 0 ? '—' : formatScore(evaluationTotal)}
              </span>
              <SaveStatus state={scoreState} />
            </div>
            {/* Column 3: note */}
            <div className="min-w-64 flex-1">
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
                    {note.admissionCategory && (
                      <span className="ml-2 text-[#C5A059]">
                        {formatAdmissionCategory(note.admissionCategory)}
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
      <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
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
