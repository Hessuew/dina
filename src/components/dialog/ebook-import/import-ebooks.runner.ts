import type { LibraryTopic } from '@/lib/library-topics'
import type { ImportRow } from '@/components/dialog/ebook-import/import-ebooks.domain'
import { buildEbookPayload } from '@/components/dialog/ebook-import/import-ebooks.domain'
import { toUserError } from '@/utils/errors'

export type ImportSettings = { category: LibraryTopic; isPublished: boolean }
export type ImportIo = {
  upload: (row: ImportRow) => Promise<string>
  create: (payload: ReturnType<typeof buildEbookPayload>) => Promise<void>
}

export type RowUpdate = (id: string, update: Partial<ImportRow>) => void

async function processImportRow(
  row: ImportRow,
  settings: ImportSettings,
  io: ImportIo,
  update: RowUpdate,
): Promise<void> {
  let uploadedPath = row.uploadedPath
  try {
    if (!uploadedPath) {
      update(row.id, { status: 'uploading', error: undefined })
      uploadedPath = await io.upload(row)
    }
    update(row.id, { status: 'creating', uploadedPath, error: undefined })
    await io.create({
      ...buildEbookPayload({ row, ...settings }),
      url: uploadedPath,
    })
    update(row.id, { status: 'succeeded', uploadedPath })
  } catch (error) {
    const message = toUserError(error).message
    update(row.id, { status: 'failed', uploadedPath, error: message })
  }
}

export async function runImportQueue(params: {
  rows: ReadonlyArray<ImportRow>
  settings: ImportSettings
  io: ImportIo
  update: RowUpdate
  shouldStop: () => boolean
  concurrency?: number
}): Promise<void> {
  const queue = [...params.rows]
  const worker = async () => {
    while (!params.shouldStop()) {
      const row = queue.shift()
      if (!row) return
      await processImportRow(row, params.settings, params.io, params.update)
    }
  }
  const workerCount = Math.min(params.concurrency ?? 3, queue.length)
  await Promise.all(Array.from({ length: workerCount }, worker))
}
