import type { AnswerPayload } from '@/hooks/useAnswerAutosave'

/** Selected option for an MC question, tolerating a missing answer. */
export function selectedOptionOf(
  answer: AnswerPayload | undefined,
): string | undefined {
  return answer?.selectedOptionId
}

/** Textarea value for an open question, tolerating a missing answer. */
export function textValueOf(answer: AnswerPayload | undefined): string {
  return answer?.textAnswer ?? ''
}
