// Signed viewer URLs are re-issued per view — a fresh token on the same
// storage object path — so the path, not the full URL, identifies which
// document the reader opened.
export function resolvePdfDocumentKey(url: string): string {
  return url.split('?')[0]
}

// PDF.js loading tasks reject their `promise` when `destroy()` runs during
// cleanup — asynchronously, after the next effect already reset its state.
// `cancelled` closes the window so a superseded task can neither flag an error
// over a freshly opened document nor install an obsolete one.
export type PdfDocumentTask<TDoc> = {
  promise: Promise<TDoc>
  destroy: () => Promise<unknown>
}

export type PdfDocumentLoadCallbacks<TDoc> = {
  onLoaded: (doc: TDoc) => void
  onFailed: () => void
}

export type PdfDocumentLoad = {
  cancel: () => void
}

export function createPdfDocumentLoad<TDoc>(
  task: PdfDocumentTask<TDoc>,
  callbacks: PdfDocumentLoadCallbacks<TDoc>,
): PdfDocumentLoad {
  let cancelled = false

  task.promise.then(
    (doc) => {
      if (!cancelled) callbacks.onLoaded(doc)
    },
    () => {
      if (!cancelled) callbacks.onFailed()
    },
  )

  return {
    cancel: () => {
      cancelled = true
      void task.destroy().catch(() => {})
    },
  }
}
