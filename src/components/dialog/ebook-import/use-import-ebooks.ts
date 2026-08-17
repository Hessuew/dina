import { useCallback, useRef, useState } from 'react'
import {
  applyDuplicateWarnings,
  editImportTitle,
  importCounts,
  initialImportRows,
  scanSelectedFiles,
  validatePdfFile,
} from './import-ebooks.domain'
import { runImportQueue } from './import-ebooks.runner'
import { parsePdfWithoutRendering } from './pdf-parser'
import type { LibraryTopic } from '@/lib/library-topics'
import type { MediaLibraryRow } from '@/utils/library'
import type { ImportRow, SkippedFile } from './import-ebooks.domain'
import type { ImportIo } from './import-ebooks.runner'

type ImportStep = 'select' | 'review' | 'upload'
type SetRows = React.Dispatch<React.SetStateAction<Array<ImportRow>>>

function updateById(
  rows: ReadonlyArray<ImportRow>,
  id: string,
  update: Partial<ImportRow>,
): Array<ImportRow> {
  return rows.map((row) => (row.id === id ? { ...row, ...update } : row))
}

async function validateRows(
  rows: ReadonlyArray<ImportRow>,
  update: (id: string, update: Partial<ImportRow>) => void,
): Promise<void> {
  const queue = [...rows]
  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      update(row.id, { validation: 'validating' })
      const result = await validatePdfFile(row.file, parsePdfWithoutRendering)
      update(
        row.id,
        result.valid
          ? { validation: 'valid', mimeType: result.mimeType }
          : {
              validation: 'invalid',
              validationMessage: result.message,
              included: false,
            },
      )
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker))
}

function useFileSelection(params: {
  beginValidation: () => number
  getCategory: () => LibraryTopic | ''
  isCurrentValidation: (generation: number) => boolean
  media: ReadonlyArray<MediaLibraryRow>
  setRows: SetRows
  setSkipped: (value: Array<SkippedFile>) => void
  setError: (value: string | undefined) => void
  patchRow: (id: string, update: Partial<ImportRow>) => void
}) {
  return useCallback(
    async (files: ReadonlyArray<File>) => {
      const generation = params.beginValidation()
      const scan = scanSelectedFiles(files)
      params.setSkipped(scan.skipped)
      if (scan.blocked) {
        params.setRows([])
        params.setError('Folder contains more than 100 PDFs')
        return
      }
      params.setError(undefined)
      const next = initialImportRows(scan)
      params.setRows(next)
      await validateRows(next, (id, update) => {
        if (params.isCurrentValidation(generation)) {
          params.patchRow(id, update)
        }
      })
      if (!params.isCurrentValidation(generation)) return
      const topic = params.getCategory()
      if (topic) {
        params.setRows((current) =>
          applyDuplicateWarnings(current, params.media, topic),
        )
      }
    },
    [params],
  )
}

function useRowEditing(params: {
  category: LibraryTopic | ''
  media: ReadonlyArray<MediaLibraryRow>
  setCategory: (topic: LibraryTopic) => void
  setRows: SetRows
}) {
  const recompute = useCallback(
    (rows: ReadonlyArray<ImportRow>, topic: LibraryTopic | '') =>
      topic ? applyDuplicateWarnings(rows, params.media, topic) : [...rows],
    [params.media],
  )
  const chooseCategory = useCallback(
    (topic: LibraryTopic) => {
      params.setCategory(topic)
      params.setRows((rows) => recompute(rows, topic))
    },
    [params, recompute],
  )
  const updateTitle = useCallback(
    (id: string, title: string) =>
      params.setRows((rows) =>
        recompute(
          rows.map((row) =>
            row.id === id ? editImportTitle(row, title) : row,
          ),
          params.category,
        ),
      ),
    [params, recompute],
  )
  const setIncluded = useCallback(
    (id: string, included: boolean) =>
      params.setRows((rows) =>
        rows.map((row) =>
          row.id === id
            ? {
                ...row,
                included,
                includeDuplicate: Boolean(row.duplicateMessage && included),
              }
            : row,
        ),
      ),
    [params],
  )
  return { chooseCategory, updateTitle, setIncluded }
}

function useSelectionModel(media: ReadonlyArray<MediaLibraryRow>) {
  const [category, setCategory] = useState<LibraryTopic | ''>('')
  const [rows, setRows] = useState<Array<ImportRow>>([])
  const [skipped, setSkipped] = useState<Array<SkippedFile>>([])
  const [selectionError, setSelectionError] = useState<string>()
  const categoryRef = useRef<LibraryTopic | ''>('')
  const validationGenerationRef = useRef(0)
  const setCurrentCategory = useCallback((topic: LibraryTopic) => {
    categoryRef.current = topic
    setCategory(topic)
  }, [])
  const beginValidation = useCallback(
    () => ++validationGenerationRef.current,
    [],
  )
  const isCurrentValidation = useCallback(
    (generation: number) => validationGenerationRef.current === generation,
    [],
  )
  const patchRow = useCallback((id: string, update: Partial<ImportRow>) => {
    setRows((current) => updateById(current, id, update))
  }, [])
  const selectFiles = useFileSelection({
    beginValidation,
    getCategory: () => categoryRef.current,
    isCurrentValidation,
    media,
    setRows,
    setSkipped,
    setError: setSelectionError,
    patchRow,
  })
  const editing = useRowEditing({
    category,
    media,
    setCategory: setCurrentCategory,
    setRows,
  })
  const resetSelection = useCallback(() => {
    validationGenerationRef.current++
    categoryRef.current = ''
    setCategory('')
    setRows([])
    setSkipped([])
    setSelectionError(undefined)
  }, [])
  return {
    category,
    rows,
    setRows,
    skipped,
    selectionError,
    patchRow,
    selectFiles,
    resetSelection,
    ...editing,
  }
}

function useImportExecution(params: {
  selection: ReturnType<typeof useSelectionModel>
  settings: { isPublished: boolean; setStep: (step: ImportStep) => void }
  io: ImportIo
  onComplete: () => Promise<void> | void
}) {
  const [active, setActive] = useState(false)
  const stopRef = useRef(false)
  const execute = useCallback(
    async (rows: ReadonlyArray<ImportRow>) => {
      if (!params.selection.category || rows.length === 0) return
      setActive(true)
      stopRef.current = false
      await runImportQueue({
        rows,
        settings: {
          category: params.selection.category,
          isPublished: params.settings.isPublished,
        },
        io: params.io,
        update: params.selection.patchRow,
        shouldStop: () => stopRef.current,
      })
      setActive(false)
      await params.onComplete()
    },
    [params],
  )
  const start = useCallback(async () => {
    params.settings.setStep('upload')
    await execute(params.selection.rows.filter((row) => row.included))
  }, [execute, params.selection.rows, params.settings])
  const retry = useCallback(async () => {
    const failed = params.selection.rows.filter(
      (row) => row.status === 'failed',
    )
    params.selection.setRows((rows) =>
      rows.map((row) =>
        row.status === 'failed' ? { ...row, status: 'queued' } : row,
      ),
    )
    await execute(failed)
  }, [execute, params.selection])
  return {
    active,
    start,
    retry,
    stop: () => {
      stopRef.current = true
    },
  }
}

export function useImportEbooks(params: {
  media: ReadonlyArray<MediaLibraryRow>
  io: ImportIo
  onComplete: () => Promise<void> | void
}) {
  const [step, setStep] = useState<ImportStep>('select')
  const [isPublished, setPublished] = useState(false)
  const selection = useSelectionModel(params.media)
  const execution = useImportExecution({
    selection,
    settings: { isPublished, setStep },
    io: params.io,
    onComplete: params.onComplete,
  })
  const reset = useCallback(() => {
    setStep('select')
    setPublished(false)
    selection.resetSelection()
  }, [selection])
  return {
    step,
    setStep,
    isPublished,
    setPublished,
    category: selection.category,
    setCategory: selection.chooseCategory,
    rows: selection.rows,
    skipped: selection.skipped,
    selectionError: selection.selectionError,
    selectFiles: selection.selectFiles,
    updateTitle: selection.updateTitle,
    setIncluded: selection.setIncluded,
    reset,
    counts: importCounts(selection.rows, selection.skipped.length),
    ...execution,
  }
}
