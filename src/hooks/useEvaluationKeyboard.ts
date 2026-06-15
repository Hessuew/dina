import { useEffect } from 'react'
import type { RefObject } from 'react'
import type {
  AdmissionCategory,
  EvaluationScore,
} from '@/utils/enrolment/domain/evaluation.domain'
import {
  ADMISSION_CATEGORY_OPTIONS,
  reduceScoreKey,
} from '@/utils/enrolment/domain/evaluation.domain'

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
  )
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
      if (isTypingTarget(event.target)) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        void onNext()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        void onPrev()
        return
      }
      if (event.key === 'Escape') {
        onClose()
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

      const categoryOption = ADMISSION_CATEGORY_OPTIONS.find(
        (option) => option.shortcut.toLowerCase() === event.key.toLowerCase(),
      )
      if (categoryOption && admissionCategoryEnabled) {
        event.preventDefault()
        saveAdmissionCategory(categoryOption.value)
        return
      }

      const result = reduceScoreKey(myScore, event.key)
      if (!result.handled) return
      event.preventDefault()
      if (result.changed) saveScore(result.score)
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
