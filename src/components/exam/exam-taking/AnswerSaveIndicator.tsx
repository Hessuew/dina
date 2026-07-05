import type { SaveState } from '@/hooks/useAnswerAutosave'

const LABELS: Record<SaveState, string> = {
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed — retrying on next change',
}

export function AnswerSaveIndicator({ state }: { state: SaveState | undefined }) {
  if (!state) return null
  return (
    <span
      className={`shrink-0 text-xs ${
        state === 'error' ? 'text-red-600' : 'text-[#8E816D]'
      }`}
      aria-live="polite"
    >
      {LABELS[state]}
    </span>
  )
}
