type FullscreenElement = {
  requestFullscreen: () => Promise<void>
}

type FullscreenDocument = {
  fullscreenElement: FullscreenElement | null
  exitFullscreen: () => Promise<void>
}

export async function toggleNativePdfFullscreen(
  fullscreenDocument: FullscreenDocument,
  container: FullscreenElement,
): Promise<'handled' | 'fallback'> {
  try {
    if (fullscreenDocument.fullscreenElement === container) {
      await fullscreenDocument.exitFullscreen()
      return 'handled'
    }
    await container.requestFullscreen()
    return 'handled'
  } catch {
    return fullscreenDocument.fullscreenElement === container
      ? 'handled'
      : 'fallback'
  }
}
