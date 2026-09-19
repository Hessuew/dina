import { useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import type { NavigateOptions } from '@tanstack/react-router'

export function useIntentPreload() {
  const router = useRouter()
  return useCallback(
    (options: NavigateOptions) => {
      void router.preloadRoute(options).catch(() => undefined)
    },
    [router],
  )
}
