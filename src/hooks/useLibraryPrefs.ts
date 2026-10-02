import { useCallback, useEffect, useState } from 'react'
import type { LibraryPrefs } from '@/utils/library/domain/library-prefs.domain'
import {
  emptyLibraryPrefs,
  libraryPrefsKey,
  parseLibraryPrefs,
  recordMediaView,
  serializeLibraryPrefs,
  setReadingPosition,
  toggleMediaStar,
} from '@/utils/library/domain/library-prefs.domain'

type LibraryPrefsState = {
  userId: string | null
  prefs: LibraryPrefs
}

function readStoredPrefs(userId: string | null | undefined): LibraryPrefs {
  if (!userId) return emptyLibraryPrefs()
  try {
    return parseLibraryPrefs(
      window.localStorage.getItem(libraryPrefsKey(userId)),
    )
  } catch {
    return emptyLibraryPrefs()
  }
}

export function useLibraryPrefs(userId: string | null | undefined) {
  const [state, setState] = useState<LibraryPrefsState>({
    userId: null,
    prefs: emptyLibraryPrefs(),
  })

  // Client-only load after mount: reading localStorage during render would
  // mismatch the SSR'd markup.
  useEffect(() => {
    setState({ userId: userId ?? null, prefs: readStoredPrefs(userId) })
  }, [userId])

  useEffect(() => {
    if (!state.userId) return
    try {
      window.localStorage.setItem(
        libraryPrefsKey(state.userId),
        serializeLibraryPrefs(state.prefs),
      )
    } catch {
      // Storage full or unavailable — prefs stay session-only.
    }
  }, [state])

  const toggleStar = useCallback(
    (mediaId: string) =>
      setState((current) => ({
        ...current,
        prefs: toggleMediaStar(current.prefs, mediaId),
      })),
    [],
  )
  const recordView = useCallback(
    (mediaId: string) =>
      setState((current) => ({
        ...current,
        prefs: recordMediaView(current.prefs, mediaId),
      })),
    [],
  )
  const savePosition = useCallback(
    (mediaId: string, page: number) =>
      setState((current) => ({
        ...current,
        prefs: setReadingPosition(current.prefs, mediaId, page),
      })),
    [],
  )

  return {
    prefs: state.prefs,
    loaded: state.userId === (userId ?? null),
    toggleStar,
    recordView,
    savePosition,
  }
}
