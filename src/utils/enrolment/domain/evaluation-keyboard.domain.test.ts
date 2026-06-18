import { describe, expect, it, vi } from 'vitest'
import { handleEvaluationKey } from './evaluation-keyboard.domain'
import type {
  EvaluationKeyHandlers,
  EvaluationKeyState,
} from './evaluation-keyboard.domain'

function makeHandlers(): EvaluationKeyHandlers {
  return {
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onClose: vi.fn(),
    focusNote: vi.fn(),
    saveScore: vi.fn(),
    saveAdmissionCategory: vi.fn(),
  }
}

function makeState(
  overrides: Partial<EvaluationKeyState> = {},
): EvaluationKeyState {
  return {
    myScore: null,
    admissionCategoryEnabled: false,
    isTyping: false,
    ...overrides,
  }
}

function makeEvent(key: string) {
  return { key, preventDefault: vi.fn() }
}

describe('handleEvaluationKey', () => {
  it('ignores every key while typing in a field', () => {
    const handlers = makeHandlers()
    const event = makeEvent('ArrowRight')
    handleEvaluationKey(event, makeState({ isTyping: true }), handlers)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(handlers.onNext).not.toHaveBeenCalled()
  })

  it('navigates to the next enrollment on ArrowRight', () => {
    const handlers = makeHandlers()
    const event = makeEvent('ArrowRight')
    handleEvaluationKey(event, makeState(), handlers)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(handlers.onNext).toHaveBeenCalled()
  })

  it('navigates to the previous enrollment on ArrowLeft', () => {
    const handlers = makeHandlers()
    const event = makeEvent('ArrowLeft')
    handleEvaluationKey(event, makeState(), handlers)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(handlers.onPrev).toHaveBeenCalled()
  })

  it('closes the overlay on Escape without preventing default', () => {
    const handlers = makeHandlers()
    const event = makeEvent('Escape')
    handleEvaluationKey(event, makeState(), handlers)
    expect(handlers.onClose).toHaveBeenCalled()
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('focuses the note on lowercase n', () => {
    const handlers = makeHandlers()
    const event = makeEvent('n')
    handleEvaluationKey(event, makeState(), handlers)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(handlers.focusNote).toHaveBeenCalled()
  })

  it('focuses the note on uppercase N', () => {
    const handlers = makeHandlers()
    const event = makeEvent('N')
    handleEvaluationKey(event, makeState(), handlers)
    expect(handlers.focusNote).toHaveBeenCalled()
  })

  it('sets the admission category when enabled and a shortcut matches', () => {
    const handlers = makeHandlers()
    const event = makeEvent('A')
    handleEvaluationKey(
      event,
      makeState({ admissionCategoryEnabled: true }),
      handlers,
    )
    expect(event.preventDefault).toHaveBeenCalled()
    expect(handlers.saveAdmissionCategory).toHaveBeenCalledWith('new')
  })

  it('matches a category shortcut case-insensitively', () => {
    const handlers = makeHandlers()
    const event = makeEvent('b')
    handleEvaluationKey(
      event,
      makeState({ admissionCategoryEnabled: true }),
      handlers,
    )
    expect(handlers.saveAdmissionCategory).toHaveBeenCalledWith('emerging')
  })

  it('ignores a category shortcut when categories are disabled', () => {
    const handlers = makeHandlers()
    const event = makeEvent('A')
    handleEvaluationKey(
      event,
      makeState({ admissionCategoryEnabled: false }),
      handlers,
    )
    expect(handlers.saveAdmissionCategory).not.toHaveBeenCalled()
    // 'A' is not a score key, so nothing is handled
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('saves a score on a digit press', () => {
    const handlers = makeHandlers()
    const event = makeEvent('3')
    handleEvaluationKey(event, makeState({ myScore: null }), handlers)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(handlers.saveScore).toHaveBeenCalledWith(3)
  })

  it('clears the score when the current value is pressed again', () => {
    const handlers = makeHandlers()
    const event = makeEvent('3')
    handleEvaluationKey(event, makeState({ myScore: 3 }), handlers)
    expect(handlers.saveScore).toHaveBeenCalledWith(null)
  })

  it('consumes Backspace but does not save when already empty', () => {
    const handlers = makeHandlers()
    const event = makeEvent('Backspace')
    handleEvaluationKey(event, makeState({ myScore: null }), handlers)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(handlers.saveScore).not.toHaveBeenCalled()
  })

  it('clears the score on Backspace when a score is set', () => {
    const handlers = makeHandlers()
    const event = makeEvent('Backspace')
    handleEvaluationKey(event, makeState({ myScore: 2 }), handlers)
    expect(handlers.saveScore).toHaveBeenCalledWith(null)
  })

  it('ignores an unrelated key', () => {
    const handlers = makeHandlers()
    const event = makeEvent('z')
    handleEvaluationKey(event, makeState(), handlers)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(handlers.saveScore).not.toHaveBeenCalled()
    expect(handlers.onNext).not.toHaveBeenCalled()
  })
})
