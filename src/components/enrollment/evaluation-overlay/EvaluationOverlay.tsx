import { useCallback, useEffect, useId, useRef, useState } from 'react'
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
import type { ReactNode, RefObject } from 'react'
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
} from '@/utils/enrolment/domain/evaluation.domain'
import {
  buildScorePatch,
  deriveEvaluationView,
  toggleScoreValue,
} from '@/components/enrollment/evaluation-overlay/evaluation-overlay.domain'
import { EnrollmentDetails } from '@/components/enrollment/enrollment-details/EnrollmentDetails'
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
  disabled,
  onClick,
}: {
  value: EvaluationScore
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  const label = EVALUATION_SCORE_LABELS[value]
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-label={`${value}: ${label}`}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-none border text-sm tabular-nums transition-colors',
              active
                ? 'border-[#C5A059] bg-[#C5A059]/20 text-[#E9D9B4]'
                : 'border-white/10 bg-[#1A1716] text-[#AFA28F] hover:border-white/25 hover:text-[#F8F4EC]',
              disabled &&
                'pointer-events-none border-white/5 bg-[#111111] text-[#5F574D] opacity-55',
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
 * Debounced (~400ms) autosave state for the note field, with a flush on
 * unmount so a pending note isn't lost when navigating away.
 */
function useDebouncedNoteSave({
  initialNote,
  onSave,
}: {
  initialNote: string
  onSave: (note: string) => Promise<void>
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

  return { value, state, handleChange }
}

/**
 * Note field for the current evaluator, with debounced autosave (~400ms).
 * Keyed by enrollment id by the parent so it re-initialises per applicant.
 */
function NoteEditor({
  initialNote,
  onSave,
  textareaRef,
  readOnly,
}: {
  initialNote: string
  onSave: (note: string) => Promise<void>
  textareaRef: RefObject<HTMLTextAreaElement | null>
  readOnly: boolean
}) {
  const { value, state, handleChange } = useDebouncedNoteSave({
    initialNote,
    onSave,
  })

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={value}
        readOnly={readOnly}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        rows={2}
        placeholder="Optional note… (Enter to finish, Shift+Enter for newline)"
        className={cn(
          'w-full resize-none rounded-none border border-white/10 bg-[#1A1716] px-3 py-2 text-sm text-[#F8F4EC] placeholder:text-[#8E816D] focus-visible:border-[#C5A059]/40 focus-visible:outline-none',
          readOnly && 'cursor-default opacity-55',
        )}
      />
      <div className="mt-1 flex justify-end">
        <SaveStatus state={state} />
      </div>
    </div>
  )
}

function OtherEvaluatorScores({
  evaluators,
}: {
  evaluators: Array<EvaluationWithAuthor>
}) {
  if (evaluators.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
      {evaluators.map((e) => (
        <span key={e.evaluatorId} className="text-sm text-[#AFA28F]">
          {e.evaluatorName}:{' '}
          <span className="font-serif text-lg font-medium text-[#E9D9B4]">
            {e.score !== null ? formatScore(e.score) : '—'}
          </span>
        </span>
      ))}
    </div>
  )
}

function OtherNotesList({ notes }: { notes: Array<EvaluationWithAuthor> }) {
  if (notes.length === 0) return null
  return (
    <div className="mt-4 space-y-2 border-t border-white/8 pt-3">
      {notes.map((note) => (
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
  )
}

function NavArrow({
  side,
  label,
  icon,
  disabled,
  onClick,
}: {
  side: string
  label: string
  icon: ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'absolute top-1/4 flex size-11 -translate-y-1/2 items-center justify-center rounded-none border border-white/10 bg-[#1A1716] text-[#AFA28F] transition-colors hover:border-[#C5A059]/40 hover:text-[#F8F4EC]',
        side,
        disabled && 'pointer-events-none opacity-25',
      )}
    >
      {icon}
    </button>
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

/** Lock background scroll while the overlay is mounted. */
function useLockBodyScroll() {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Trap Tab/Shift+Tab focus within the given element. */
function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const nodes = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handleTab)
    return () => el.removeEventListener('keydown', handleTab)
  }, [ref])
}

function useEvaluationMutations({
  enrollmentId,
  onLocalEvaluation,
  pendingPrevScoreRef,
  pendingPrevAdmissionCategoryRef,
}: {
  enrollmentId: string
  onLocalEvaluation: EvaluationOverlayProps['onLocalEvaluation']
  pendingPrevScoreRef: RefObject<number | null>
  pendingPrevAdmissionCategoryRef: RefObject<AdmissionCategory | null>
}) {
  const scoreFn = useServerFn(setEvaluationScore)
  const categoryFn = useServerFn(setEvaluationAdmissionCategory)
  const noteFn = useServerFn(setEvaluationNote)

  const scoreMutation = useMutation({
    fn: scoreFn,
    onError: () => {
      onLocalEvaluation(enrollmentId, {
        score: pendingPrevScoreRef.current,
        admissionCategory: pendingPrevAdmissionCategoryRef.current,
      })
      toast.error('Failed to save score')
    },
  })
  const categoryMutation = useMutation({
    fn: categoryFn,
    onError: () => {
      onLocalEvaluation(enrollmentId, {
        admissionCategory: pendingPrevAdmissionCategoryRef.current,
      })
      toast.error('Failed to save category')
    },
  })
  const noteMutation = useMutation({ fn: noteFn })

  return { scoreMutation, categoryMutation, noteMutation }
}

type EvaluationMutations = ReturnType<typeof useEvaluationMutations>

function useEvaluationActions({
  enrollmentId,
  myScore,
  myAdmissionCategory,
  canEvaluate,
  onLocalEvaluation,
  mutations,
  pendingPrevScoreRef,
  pendingPrevAdmissionCategoryRef,
}: {
  enrollmentId: string
  myScore: number | null
  myAdmissionCategory: AdmissionCategory | null
  canEvaluate: boolean
  onLocalEvaluation: EvaluationOverlayProps['onLocalEvaluation']
  mutations: EvaluationMutations
  pendingPrevScoreRef: RefObject<number | null>
  pendingPrevAdmissionCategoryRef: RefObject<AdmissionCategory | null>
}) {
  const { scoreMutation, categoryMutation, noteMutation } = mutations

  const saveScore = useCallback(
    (score: number | null) => {
      if (!canEvaluate) return
      if (scoreMutation.isPending) return
      pendingPrevScoreRef.current = myScore
      pendingPrevAdmissionCategoryRef.current = myAdmissionCategory
      onLocalEvaluation(enrollmentId, buildScorePatch(score))
      void scoreMutation.mutate({ data: { enrollmentId, score } })
    },
    [
      canEvaluate,
      enrollmentId,
      myAdmissionCategory,
      myScore,
      onLocalEvaluation,
      scoreMutation,
    ],
  )

  const saveAdmissionCategory = useCallback(
    (admissionCategory: AdmissionCategory) => {
      if (!canEvaluate) return
      if (myScore !== 3 && myScore !== 4) return
      if (categoryMutation.isPending) return
      pendingPrevAdmissionCategoryRef.current = myAdmissionCategory
      onLocalEvaluation(enrollmentId, { admissionCategory })
      void categoryMutation.mutate({
        data: { enrollmentId, score: myScore, admissionCategory },
      })
    },
    [
      canEvaluate,
      categoryMutation,
      enrollmentId,
      myAdmissionCategory,
      myScore,
      onLocalEvaluation,
    ],
  )

  const handleScoreButton = (value: EvaluationScore) =>
    saveScore(toggleScoreValue(value, myScore))

  const saveNote = useCallback(
    async (note: string) => {
      if (!canEvaluate) return
      if (noteMutation.isPending) return
      onLocalEvaluation(enrollmentId, { note })
      await noteMutation.mutate({ data: { enrollmentId, note } })
    },
    [canEvaluate, enrollmentId, onLocalEvaluation, noteMutation],
  )

  return { saveScore, saveAdmissionCategory, handleScoreButton, saveNote }
}

function useEvaluationOverlay({
  enrollment,
  evaluations,
  userId,
  onLocalEvaluation,
  onNext,
  onPrev,
  onClose,
}: EvaluationOverlayProps) {
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const pendingPrevScoreRef = useRef<number | null>(null)
  const pendingPrevAdmissionCategoryRef = useRef<AdmissionCategory | null>(null)

  const view = deriveEvaluationView({ evaluations, userId })

  const mutations = useEvaluationMutations({
    enrollmentId: enrollment.id,
    onLocalEvaluation,
    pendingPrevScoreRef,
    pendingPrevAdmissionCategoryRef,
  })

  const actions = useEvaluationActions({
    enrollmentId: enrollment.id,
    myScore: view.myScore,
    myAdmissionCategory: view.myAdmissionCategory,
    canEvaluate: enrollment.canEvaluate,
    onLocalEvaluation,
    mutations,
    pendingPrevScoreRef,
    pendingPrevAdmissionCategoryRef,
  })

  useLockBodyScroll()

  // Keyboard: scoring, navigation, close. Ignored while typing in the note.
  useEvaluationKeyboard({
    myScore: view.myScore,
    admissionCategoryEnabled: view.admissionCategoryEnabled,
    noteRef,
    onNext,
    onPrev,
    onClose,
    saveScore: actions.saveScore,
    saveAdmissionCategory: actions.saveAdmissionCategory,
  })

  return {
    ...view,
    ...actions,
    noteRef,
    canEvaluate: enrollment.canEvaluate,
    scoreState: toSaveState(mutations.scoreMutation),
    categoryState: toSaveState(mutations.categoryMutation),
  }
}

type EvaluationOverlayModel = ReturnType<typeof useEvaluationOverlay>

function EvaluationOverlayHeader({
  enrollment,
  otherEvaluators,
  titleId,
  onClose,
}: {
  enrollment: EnrollmentWithEvaluation
  otherEvaluators: Array<EvaluationWithAuthor>
  titleId: string
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2
          id={titleId}
          className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]"
        >
          {enrollment.fullLegalName}
        </h2>
        <OtherEvaluatorScores evaluators={otherEvaluators} />
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
          autoFocus
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 items-center justify-center rounded-none border border-white/10 text-[#AFA28F] hover:border-white/25 hover:text-[#F8F4EC]"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

function ScoreCategoryColumn({ overlay }: { overlay: EvaluationOverlayModel }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {EVALUATION_SCORES.map((value) => (
          <ScoreButton
            key={value}
            value={value}
            active={overlay.myScore === value}
            disabled={!overlay.canEvaluate}
            onClick={() => overlay.handleScoreButton(value)}
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
            active={overlay.myAdmissionCategory === option.value}
            disabled={!overlay.canEvaluate || !overlay.admissionCategoryEnabled}
            onClick={overlay.saveAdmissionCategory}
          />
        ))}
        <span
          className={cn(
            'text-[0.62rem] font-medium tracking-[0.18em] uppercase',
            overlay.admissionCategoryMissing
              ? 'text-[#C5A059]'
              : 'text-[#8E816D]',
          )}
        >
          Category
        </span>
        <SaveStatus state={overlay.categoryState} />
      </div>
    </div>
  )
}

function TotalScoreColumn({ overlay }: { overlay: EvaluationOverlayModel }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[0.62rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
        Total score
      </span>
      <span className="font-serif text-2xl text-[#E9D9B4] tabular-nums">
        {overlay.evaluationCount === 0
          ? '—'
          : formatScore(overlay.evaluationTotal)}
      </span>
      <SaveStatus state={overlay.scoreState} />
    </div>
  )
}

function EvaluationControlStrip({
  overlay,
  enrollmentId,
}: {
  overlay: EvaluationOverlayModel
  enrollmentId: string
}) {
  return (
    <div className="mt-3 flex items-start gap-4">
      <ScoreCategoryColumn overlay={overlay} />
      <TotalScoreColumn overlay={overlay} />
      <div className="min-w-64 flex-1">
        <NoteEditor
          key={enrollmentId}
          initialNote={overlay.myNote}
          onSave={overlay.saveNote}
          textareaRef={overlay.noteRef}
          readOnly={!overlay.canEvaluate}
        />
      </div>
    </div>
  )
}

export function EvaluationOverlay(props: EvaluationOverlayProps) {
  const { enrollment, isAdmin, hasPrev, hasNext, onPrev, onNext, onClose } =
    props
  const overlay = useEvaluationOverlay(props)
  const overlayRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useFocusTrap(overlayRef)

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-70 flex flex-col bg-[#0B0B0C]/96 pt-10 backdrop-blur-sm"
    >
      {/* Evaluation panel — sits on top of the application content */}
      <div className="border-b border-white/10 bg-[#151515]/95">
        <div className="mx-auto w-full max-w-5xl px-6 py-4">
          <EvaluationOverlayHeader
            enrollment={enrollment}
            otherEvaluators={overlay.otherEvaluators}
            titleId={titleId}
            onClose={onClose}
          />

          <EvaluationControlStrip
            overlay={overlay}
            enrollmentId={enrollment.id}
          />

          {/* Other evaluators' notes */}
          <OtherNotesList notes={overlay.otherNotes} />
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
      <NavArrow
        side="left-1/10"
        label="Previous"
        icon={<ChevronLeft className="size-5" />}
        disabled={!hasPrev}
        onClick={onPrev}
      />
      <NavArrow
        side="right-1/10"
        label="Next"
        icon={<ChevronRight className="size-5" />}
        disabled={!hasNext}
        onClick={onNext}
      />
    </div>
  )
}
