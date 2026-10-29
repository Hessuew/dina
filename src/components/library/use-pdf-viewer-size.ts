import { useEffect, useState } from 'react'

const PDF_VIEWER_VERTICAL_CHROME = 120
const PDF_VIEWER_FULLSCREEN_CHROME = 72
const MIN_PAGE_HEIGHT = 320

export type ViewerSize = {
  width: number
  height: number
}

export function useViewerSize(
  container: HTMLDivElement | null,
  isFullscreen: boolean,
) {
  const [viewerSize, setViewerSize] = useState<ViewerSize>({
    width: 800,
    height: 800,
  })

  useEffect(() => {
    const updateViewerSize = () => {
      const width = container?.clientWidth ?? 800
      const height = Math.max(
        MIN_PAGE_HEIGHT,
        window.innerHeight -
          (isFullscreen
            ? PDF_VIEWER_FULLSCREEN_CHROME
            : PDF_VIEWER_VERTICAL_CHROME),
      )

      setViewerSize((current) => {
        if (current.width === width && current.height === height) return current
        return { width, height }
      })
    }

    updateViewerSize()

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateViewerSize)
    if (container) resizeObserver?.observe(container)
    window.addEventListener('resize', updateViewerSize)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateViewerSize)
    }
  }, [container, isFullscreen])

  return viewerSize
}
