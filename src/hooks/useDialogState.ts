import { useState } from 'react'

type DialogMode = 'create' | 'edit' | 'delete' | 'view'

interface UseDialogStateReturn<T> {
  isOpen: boolean
  dialogMode: DialogMode
  dialogItem: T | undefined
  openDialog: (mode: DialogMode, item?: T) => void
  closeDialog: () => void
}

export function useDialogState<T = unknown>(): UseDialogStateReturn<T> {
  const [state, setState] = useState<{ mode: DialogMode; item?: T } | null>(
    null,
  )

  return {
    isOpen: state !== null,
    dialogMode: state?.mode ?? 'create',
    dialogItem: state?.item,
    openDialog: (mode, item) => setState({ mode, item }),
    closeDialog: () => setState(null),
  }
}
