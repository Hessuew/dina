import { useCallback, useEffect, useState } from 'react'
import { toggleNativePdfFullscreen } from '@/components/library/pdf-viewer.fullscreen'

function useNativeFullscreen(container: HTMLDivElement | null) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    const update = () => {
      setIsFullscreen(
        container != null && document.fullscreenElement === container,
      )
      setIsSupported(
        Boolean(container?.requestFullscreen && document.exitFullscreen),
      )
    }
    update()
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [container])

  const toggle = async (): Promise<'handled' | 'fallback'> => {
    if (!container) return 'handled'
    return toggleNativePdfFullscreen(document, container)
  }

  return { isFullscreen, isSupported, toggle }
}

function useFallbackFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isFullscreen) return
    const previousOverflow = document.body.style.overflow
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', exitOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', exitOnEscape)
    }
  }, [isFullscreen])

  return {
    isFullscreen,
    enter: useCallback(() => setIsFullscreen(true), []),
    toggle: useCallback(() => setIsFullscreen((current) => !current), []),
  }
}

export function usePdfFullscreen(container: HTMLDivElement | null) {
  const native = useNativeFullscreen(container)
  const fallback = useFallbackFullscreen()

  // A surface unmount (e.g. leaving the route) would strand fallback fullscreen
  // with body overflow hidden — exit it so the page stays usable.
  useEffect(() => {
    if (container == null && fallback.isFullscreen) fallback.toggle()
  }, [container, fallback.isFullscreen, fallback.toggle])

  const toggle = () => {
    if (fallback.isFullscreen) {
      fallback.toggle()
      return
    }
    if (native.isSupported) {
      void native.toggle().then((result) => {
        if (result === 'fallback') fallback.enter()
      })
      return
    }
    fallback.toggle()
  }
  return {
    isFullscreen: native.isFullscreen || fallback.isFullscreen,
    isFallbackFullscreen: fallback.isFullscreen,
    toggle,
  }
}
