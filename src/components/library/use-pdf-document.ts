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
  const [issuance, setIssuance] = useState(0)
  const docKey = resolvePdfDocumentKey(url)
  const docKeyRef = useRef(docKey)
  const issuedUrlRef = useRef(url)

  useEffect(() => {
    issuedUrlRef.current = url
  }, [url])

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
        // A preserved page can exceed a shorter document reloaded under the
        // same key (e.g. the storage object was replaced out-of-band).
        setPageNum((page) => Math.min(page, doc.numPages))
        setLoading(false)
      },
      onFailed: () => {
        setLoading(false)
        setError(true)
      },
    })
    return () => load.cancel()
  }, [url, docKey, issuance])

  // Reload the route loader so a retry always loads a freshly issued signed
  // URL — the issued one expires after an hour (ADR 0002), so no request goes
  // out against a stale URL. A reissue that changes the URL reloads through
  // the effect's url dep on its own; only a byte-identical reissue
  // (same-second re-signing) leaves the dep unchanged, so the issuance bump
  // drives the load just for that case.
  const retry = useCallback(() => {
    const failed = issuedUrlRef.current
    void router
      .invalidate()
      .then(() => {
        if (issuedUrlRef.current === failed) {
          setIssuance((count) => count + 1)
        }
      })
      .catch(() => {})
  }, [router])

  return { pdf, pageNum, setPageNum, numPages, loading, error, retry, docKey }
}
