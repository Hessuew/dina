import type { PdfParser } from '@/components/dialog/ebook-import/import-ebooks.domain'

export const parsePdfWithoutRendering: PdfParser = async (data) => {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const task = pdfjs.getDocument({ data })
  try {
    const document = await task.promise
    const result = { numPages: document.numPages }
    await document.destroy()
    return result
  } finally {
    await task.destroy()
  }
}
