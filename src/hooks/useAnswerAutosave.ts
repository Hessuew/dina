import * as React from 'react'
import { saveExamAnswer } from '@/utils/exam'
import { toUserError } from '@/utils/errors'

export type AnswerPayload = {
  selectedOptionId?: string
  textAnswer?: string
}

export type SaveState = 'saving' | 'saved' | 'error'

const EXPIRED_MESSAGE = 'Exam time has expired'

async function performSave(
  attemptId: string,
  questionId: string,
  payload: AnswerPayload,
  retriesLeft: number,
): Promise<'saved' | 'error' | 'expired'> {
  try {
    await saveExamAnswer({ data: { attemptId, questionId, ...payload } })
    return 'saved'
  } catch (error) {
    if (toUserError(error).message === EXPIRED_MESSAGE) return 'expired'
    if (retriesLeft > 0) {
      return performSave(attemptId, questionId, payload, retriesLeft - 1)
    }
    return 'error'
  }
}

/**
 * Debounced per-question autosave. Every answer is upserted to the server as
 * the student answers — the saved answers are the durable submission (ADR
 * 0017). An expired save flips the whole page via `onExpired`.
 */
export function useAnswerAutosave(attemptId: string, onExpired: () => void) {
  const [saveStates, setSaveStates] = React.useState<Record<string, SaveState>>(
    {},
  )
  const timersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  )
  const onExpiredRef = React.useRef(onExpired)
  onExpiredRef.current = onExpired

  React.useEffect(() => {
    const timers = timersRef.current
    return () => Object.values(timers).forEach(clearTimeout)
  }, [])

  const queueSave = React.useCallback(
    (questionId: string, payload: AnswerPayload, debounceMs: number) => {
      setSaveStates((states) => ({ ...states, [questionId]: 'saving' }))
      clearTimeout(timersRef.current[questionId])
      timersRef.current[questionId] = setTimeout(() => {
        void performSave(attemptId, questionId, payload, 1).then((result) => {
          if (result === 'expired') {
            onExpiredRef.current()
            return
          }
          setSaveStates((states) => ({ ...states, [questionId]: result }))
        })
      }, debounceMs)
    },
    [attemptId],
  )

  return { queueSave, saveStates }
}
