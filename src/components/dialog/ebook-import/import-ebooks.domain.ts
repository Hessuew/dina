import type { LibraryTopic } from '@/lib/library-topics'
import type { MediaLibraryRow } from '@/utils/library'

const MAX_EBOOK_FILES = 100
const MAX_EBOOK_BYTES = 25 * 1024 * 1024

export type PdfParseResult = { numPages: number }
export type PdfParser = (data: ArrayBuffer) => Promise<PdfParseResult>
export type ValidationState = 'pending' | 'validating' | 'valid' | 'invalid'
export type ImportStatus =
  'queued' | 'uploading' | 'creating' | 'succeeded' | 'failed'

export type ImportRow = {
  id: string
  file: File
  relativePath: string
  title: string
  mimeType: string
  validation: ValidationState
  validationMessage?: string
  duplicateMessage?: string
  includeDuplicate: boolean
  included: boolean
  status: ImportStatus
  error?: string
  uploadedPath?: string
}

export type SkippedFile = { path: string; reason: string }
export type SelectionScan = {
  pdfs: Array<{ file: File; relativePath: string }>
  skipped: Array<SkippedFile>
  blocked: boolean
}

function selectionPath(file: File): string {
  return file.webkitRelativePath || file.name
}

export function isHiddenOsPath(path: string): boolean {
  const segments = path.split('/')
  return segments.some(
    (part) =>
      part.startsWith('.') ||
      part === '__MACOSX' ||
      part.toLowerCase() === 'thumbs.db' ||
      part.toLowerCase() === 'desktop.ini',
  )
}

export function scanSelectedFiles(files: ReadonlyArray<File>): SelectionScan {
  const visible = files.filter((file) => !isHiddenOsPath(selectionPath(file)))
  const pdfs = visible
    .filter((file) => file.name.toLowerCase().endsWith('.pdf'))
    .map((file) => ({ file, relativePath: selectionPath(file) }))
  const skipped = visible
    .filter((file) => !file.name.toLowerCase().endsWith('.pdf'))
    .map((file) => ({
      path: selectionPath(file),
      reason: 'Unsupported file type (PDF required)',
    }))
  return { pdfs, skipped, blocked: pdfs.length > MAX_EBOOK_FILES }
}

export function deriveEbookTitle(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replaceAll('_', ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function initialImportRows(scan: SelectionScan): Array<ImportRow> {
  return scan.pdfs.map(({ file, relativePath }, index) => ({
    id: `${index}-${relativePath}`,
    file,
    relativePath,
    title: deriveEbookTitle(file.name),
    mimeType: file.type,
    validation: 'pending',
    includeDuplicate: false,
    included: true,
    status: 'queued',
  }))
}

function mimeIsCompatible(mime: string): boolean {
  return (
    mime === '' ||
    mime === 'application/pdf' ||
    mime === 'application/octet-stream'
  )
}

function parserErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'PDF could not be parsed'
  const detail = `${error.name} ${error.message}`.toLowerCase()
  if (detail.includes('password')) return 'Password-protected PDF'
  return 'Corrupt or unreadable PDF'
}

export async function validatePdfFile(
  file: File,
  parse: PdfParser,
): Promise<
  { valid: true; mimeType: string } | { valid: false; message: string }
> {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, message: 'File extension must be .pdf' }
  }
  if (!mimeIsCompatible(file.type)) {
    return { valid: false, message: 'File MIME type is not PDF-compatible' }
  }
  if (file.size === 0) return { valid: false, message: 'File is empty' }
  if (file.size > MAX_EBOOK_BYTES) {
    return { valid: false, message: 'File exceeds 25MB limit' }
  }
  try {
    const result = await parse(await file.arrayBuffer())
    if (result.numPages < 1)
      return { valid: false, message: 'PDF has no pages' }
    return { valid: true, mimeType: 'application/pdf' }
  } catch (error) {
    return { valid: false, message: parserErrorMessage(error) }
  }
}

export function applyDuplicateWarnings(
  rows: ReadonlyArray<ImportRow>,
  existing: ReadonlyArray<MediaLibraryRow>,
  category: LibraryTopic,
): Array<ImportRow> {
  const existingTitles = new Set(
    existing
      .filter(
        (item) =>
          item.category === category &&
          item.fileType === 'document' &&
          !item.allowsDownload,
      )
      .map((item) => normalizeTitle(item.title)),
  )
  const counts = new Map<string, number>()
  for (const row of rows) {
    const title = normalizeTitle(row.title)
    counts.set(title, (counts.get(title) ?? 0) + 1)
  }
  return rows.map((row) => applyRowDuplicate(row, existingTitles, counts))
}

function applyRowDuplicate(
  row: ImportRow,
  existingTitles: ReadonlySet<string>,
  counts: ReadonlyMap<string, number>,
): ImportRow {
  const title = normalizeTitle(row.title)
  const duplicateMessage = existingTitles.has(title)
    ? 'Title already exists in this category'
    : counts.get(title)! > 1
      ? 'Duplicate title in this import'
      : undefined
  const validTitle = title.length > 0
  return {
    ...row,
    duplicateMessage,
    included:
      row.validation === 'valid' &&
      validTitle &&
      (!duplicateMessage || row.includeDuplicate),
  }
}

export function editImportTitle(row: ImportRow, title: string): ImportRow {
  return { ...row, title, includeDuplicate: false }
}

export function buildEbookPayload(params: {
  row: ImportRow
  category: LibraryTopic
  isPublished: boolean
}) {
  return {
    title: params.row.title.trim().replace(/\s+/g, ' '),
    category: params.category,
    description: undefined,
    isPublished: params.isPublished,
    allowsDownload: false,
    kind: 'document' as const,
    url: params.row.uploadedPath ?? '',
    fileSize: params.row.file.size,
    courseId: undefined,
  }
}

export function importCounts(rows: ReadonlyArray<ImportRow>, skipped: number) {
  return {
    imported: rows.filter((row) => row.status === 'succeeded').length,
    failed: rows.filter((row) => row.status === 'failed').length,
    skipped:
      skipped + rows.filter((row) => row.validation === 'invalid').length,
  }
}
