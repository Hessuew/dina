import { ADMISSION_CATEGORY_OPTIONS, reduceScoreKey } from './evaluation.domain'
import type { AdmissionCategory, EvaluationScore } from './evaluation.domain'

/** The single key event field the dispatcher needs (a real `KeyboardEvent` satisfies this). */
export type EvaluationKeyEvent = {
  key: string
  preventDefault: () => void
}

/** Evaluation overlay state that influences key handling. */
export type EvaluationKeyState = {
  myScore: number | null
  admissionCategoryEnabled: boolean
  /** True when focus is in a text field, where shortcuts are suppressed. */
  isTyping: boolean
}

/** Side effects the dispatcher invokes; the hook wires these to React/DOM. */
export type EvaluationKeyHandlers = {
  onNext: () => void | Promise<void>
  onPrev: () => void | Promise<void>
  onClose: () => void
  focusNote: () => void
  saveScore: (score: EvaluationScore | null) => void
  saveAdmissionCategory: (category: AdmissionCategory) => void
}

/**
 * Keyboard shortcuts for the evaluation overlay: arrows navigate, Escape closes,
 * `n`/`N` focuses the note, `A`/`B`/`C` set the admission category (when enabled),
 * and `0`-`4`/Backspace/Delete set or clear the score. All shortcuts are ignored
 * while typing in a text field.
 */
export function handleEvaluationKey(
  event: EvaluationKeyEvent,
  state: EvaluationKeyState,
  handlers: EvaluationKeyHandlers,
): void {
  if (state.isTyping) return

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    void handlers.onNext()
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    void handlers.onPrev()
    return
  }
  if (event.key === 'Escape') {
    handlers.onClose()
    return
  }
  if (event.key === 'n' || event.key === 'N') {
    event.preventDefault()
    handlers.focusNote()
    return
  }

  const categoryOption = ADMISSION_CATEGORY_OPTIONS.find(
    (option) => option.shortcut.toLowerCase() === event.key.toLowerCase(),
  )
  if (categoryOption && state.admissionCategoryEnabled) {
    event.preventDefault()
    handlers.saveAdmissionCategory(categoryOption.value)
    return
  }

  const result = reduceScoreKey(state.myScore, event.key)
  if (!result.handled) return
  event.preventDefault()
  if (result.changed) handlers.saveScore(result.score)
}
