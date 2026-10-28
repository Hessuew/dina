import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
// Legacy build polyfills Promise.withResolvers for older browsers (DINA-Z).
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
  createPdfDocumentLoad,
  resolvePdfDocumentKey,
} from '@/components/library/pdf-document.domain'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export function usePdfDocument(url: string) {
  const router = useRouter()
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const docKey = resolvePdfDocumentKey(url)
  const docKeyRef = useRef(docKey)

  useEffect(() => {
    setLoading(true)
    setError(false)
    // A re-issued signed URL for the same document keeps the reader's page;
    // only opening a different document resets to page one.
    if (docKeyRef.current !== docKey) {
      docKeyRef.current = docKey
      setPageNum(1)
    }
    setPdf(null)

    let task: ReturnType<typeof pdfjsLib.getDocument>
    try {
      task = pdfjsLib.getDocument({ url })
    } catch {
      setLoading(false)
      setError(true)
      return
    }

    const load = createPdfDocumentLoad(task, {
      onLoaded: (doc) => {
        setPdf(doc)
        setNumPages(doc.numPages)
        setLoading(false)
      },
      onFailed: () => {
        setLoading(false)
        setError(true)
      },
    })
    return () => load.cancel()
  }, [url, docKey])

  // Reload the route loader so a retry gets a fresh signed URL — the issued
  // one expires after an hour (ADR 0002). The new URL drives the reload, so
  // no request ever goes out against the stale URL.
  const retry = useCallback(() => {
    void router.invalidate()
  }, [router])

  return { pdf, pageNum, setPageNum, numPages, loading, error, retry, docKey }
}
