import { useEffect } from 'react'
import type { RefObject } from 'react'
import type {
  AdmissionCategory,
  EvaluationScore,
} from '@/utils/enrolment/domain/evaluation.domain'
import { handleEvaluationKey } from '@/utils/enrolment/domain/evaluation-keyboard.domain'

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
  )
}

function focusNoteEnd(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.focus()
  const end = el.value.length
  el.setSelectionRange(end, end)
}

type UseEvaluationKeyboardArgs = {
  myScore: number | null
  admissionCategoryEnabled: boolean
  noteRef: RefObject<HTMLTextAreaElement | null>
  onNext: () => void | Promise<void>
  onPrev: () => void | Promise<void>
  onClose: () => void
  saveScore: (score: EvaluationScore | null) => void
  saveAdmissionCategory: (category: AdmissionCategory) => void
}

/**
 * Window keyboard shortcuts for the evaluation overlay: arrows navigate,
 * Escape closes, `n` focuses the note, `A`/`B`/`C` set admission category,
 * and `0`-`4` set the score. Ignored while typing in the note field.
 */
export function useEvaluationKeyboard({
  myScore,
  admissionCategoryEnabled,
  noteRef,
  onNext,
  onPrev,
  onClose,
  saveScore,
  saveAdmissionCategory,
}: UseEvaluationKeyboardArgs) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleEvaluationKey(
        event,
        {
          myScore,
          admissionCategoryEnabled,
          isTyping: isTypingTarget(event.target),
        },
        {
          onNext,
          onPrev,
          onClose,
          focusNote: () => focusNoteEnd(noteRef.current),
          saveScore,
          saveAdmissionCategory,
        },
      )
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    admissionCategoryEnabled,
    myScore,
    noteRef,
    onNext,
    onPrev,
    onClose,
    saveAdmissionCategory,
    saveScore,
  ])
}
