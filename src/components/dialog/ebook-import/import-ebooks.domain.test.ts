import { describe, expect, it, vi } from 'vitest'
import {
  applyDuplicateWarnings,
  buildEbookPayload,
  deriveEbookTitle,
  editImportTitle,
  importCounts,
  initialImportRows,
  isHiddenOsPath,
  normalizeTitle,
  scanSelectedFiles,
  validatePdfFile,
} from './import-ebooks.domain'
import type { MediaLibraryRow } from '@/utils/library'

function file(
  name: string,
  options: { type?: string; size?: number; path?: string } = {},
) {
  const value = new File([new Uint8Array(options.size ?? 4)], name, {
    type: options.type ?? 'application/pdf',
  })
  if (options.path)
    Object.defineProperty(value, 'webkitRelativePath', { value: options.path })
  return value
}

function row(name = 'Book.pdf') {
  return initialImportRows(scanSelectedFiles([file(name)]))[0]
}

function media(
  title: string,
  overrides: Partial<MediaLibraryRow> = {},
): MediaLibraryRow {
  return {
    id: title,
    uploaderId: 'u',
    courseId: null,
    title,
    category: 'Wisdom',
    description: null,
    fileUrl: 'path',
    fileType: 'document',
    fileSize: 4,
    thumbnailUrl: null,
    isPublished: false,
    allowsDownload: false,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  }
}

describe('selection scanning', () => {
  it.each([
    '.hidden.pdf',
    'folder/.secret/book.pdf',
    '__MACOSX/book.pdf',
    'Thumbs.db',
    'desktop.ini',
  ])('recognizes hidden OS path %s', (path) =>
    expect(isHiddenOsPath(path)).toBe(true),
  )

  it('keeps normal paths and reports unsupported files', () => {
    const scan = scanSelectedFiles([
      file('book.pdf', { path: 'nested/book.pdf' }),
      file('notes.txt', { path: 'nested/notes.txt' }),
      file('.DS_Store'),
    ])
    expect(isHiddenOsPath('nested/book.pdf')).toBe(false)
    expect(scan).toMatchObject({
      blocked: false,
      pdfs: [{ relativePath: 'nested/book.pdf' }],
      skipped: [
        {
          path: 'nested/notes.txt',
          reason: 'Unsupported file type (PDF required)',
        },
      ],
    })
  })

  it('blocks more than 100 visible PDFs', () => {
    const scan = scanSelectedFiles(
      Array.from({ length: 101 }, (_, index) => file(`${index}.pdf`)),
    )
    expect(scan.blocked).toBe(true)
    expect(scan.pdfs).toHaveLength(101)
  })

  it('allows exactly 100 PDFs', () => {
    const scan = scanSelectedFiles(
      Array.from({ length: 100 }, (_, index) => file(`${index}.pdf`)),
    )
    expect(scan.blocked).toBe(false)
  })
})

describe('titles and rows', () => {
  it('derives and normalizes titles', () => {
    expect(deriveEbookTitle('  My__Great   Book.PDF')).toBe('My Great Book')
    expect(normalizeTitle('  MY   Book ')).toBe('my book')
  })

  it('creates queued rows and resets duplicate opt-in on edit', () => {
    const created = row('my_book.pdf')
    expect(created).toMatchObject({
      title: 'my book',
      validation: 'pending',
      status: 'queued',
      included: true,
    })
    expect(
      editImportTitle({ ...created, includeDuplicate: true }, 'New'),
    ).toMatchObject({ title: 'New', includeDuplicate: false })
  })
})

describe('PDF validation', () => {
  const validParser = vi.fn(async () => ({ numPages: 2 }))

  it('rejects extension, MIME, empty, oversized, and zero-page files', async () => {
    expect(await validatePdfFile(file('x.txt'), validParser)).toEqual({
      valid: false,
      message: 'File extension must be .pdf',
    })
    expect(
      await validatePdfFile(file('x.pdf', { type: 'text/plain' }), validParser),
    ).toEqual({ valid: false, message: 'File MIME type is not PDF-compatible' })
    expect(
      await validatePdfFile(file('x.pdf', { size: 0 }), validParser),
    ).toEqual({ valid: false, message: 'File is empty' })
    expect(
      await validatePdfFile(
        file('x.pdf', { size: 25 * 1024 * 1024 + 1 }),
        validParser,
      ),
    ).toEqual({ valid: false, message: 'File exceeds 25MB limit' })
    expect(
      await validatePdfFile(file('x.pdf'), async () => ({ numPages: 0 })),
    ).toEqual({ valid: false, message: 'PDF has no pages' })
  })

  it.each(['', 'application/octet-stream', 'application/pdf'])(
    'accepts parsed %s MIME',
    async (type) => {
      expect(
        await validatePdfFile(file('x.pdf', { type }), validParser),
      ).toEqual({ valid: true, mimeType: 'application/pdf' })
    },
  )

  it('classifies corrupt and password-protected parser failures', async () => {
    const password = new Error('Password required')
    password.name = 'PasswordException'
    expect(
      await validatePdfFile(file('x.pdf'), async () => {
        throw password
      }),
    ).toEqual({ valid: false, message: 'Password-protected PDF' })
    expect(
      await validatePdfFile(file('x.pdf'), async () => {
        throw new Error('bad xref')
      }),
    ).toEqual({ valid: false, message: 'Corrupt or unreadable PDF' })
    expect(
      await validatePdfFile(file('x.pdf'), async () => {
        throw 'bad'
      }),
    ).toEqual({ valid: false, message: 'PDF could not be parsed' })
  })
})

describe('duplicate detection and payloads', () => {
  it('excludes existing and in-batch duplicates until opted in', () => {
    const rows = [
      { ...row('Existing.pdf'), validation: 'valid' as const },
      { ...row('Same.pdf'), id: 'a', validation: 'valid' as const },
      {
        ...row('same.pdf'),
        id: 'b',
        validation: 'valid' as const,
        includeDuplicate: true,
      },
    ]
    const result = applyDuplicateWarnings(
      rows,
      [
        media(' existing '),
        media('ignored', { allowsDownload: true }),
        media('other', { category: 'Faith' }),
      ],
      'Wisdom',
    )
    expect(
      result.map((item) => [item.duplicateMessage, item.included]),
    ).toEqual([
      ['Title already exists in this category', false],
      ['Duplicate title in this import', false],
      ['Duplicate title in this import', true],
    ])
  })

  it('excludes blank and invalid rows and keeps unique valid titles', () => {
    const result = applyDuplicateWarnings(
      [
        { ...row('one.pdf'), title: '', validation: 'valid' },
        { ...row('two.pdf'), validation: 'invalid' },
        { ...row('three.pdf'), validation: 'valid' },
      ],
      [media('video', { fileType: 'video' })],
      'Wisdom',
    )
    expect(result.map((item) => item.included)).toEqual([false, false, true])
  })

  it('clears a duplicate warning after a title edit', () => {
    const duplicate = applyDuplicateWarnings(
      [{ ...row('Existing.pdf'), validation: 'valid' }],
      [media('Existing')],
      'Wisdom',
    )[0]
    const edited = editImportTitle(duplicate, 'Unique')
    expect(
      applyDuplicateWarnings([edited], [media('Existing')], 'Wisdom')[0],
    ).toMatchObject({
      duplicateMessage: undefined,
      includeDuplicate: false,
      included: true,
    })
  })

  it('builds fixed eBook payload and result counts', () => {
    const source = {
      ...row(),
      title: '  My   Book ',
      uploadedPath: 'owned/book.pdf',
    }
    expect(
      buildEbookPayload({ row: source, category: 'Faith', isPublished: true }),
    ).toEqual({
      title: 'My Book',
      category: 'Faith',
      description: undefined,
      isPublished: true,
      allowsDownload: false,
      kind: 'document',
      url: 'owned/book.pdf',
      fileSize: 4,
      courseId: undefined,
    })
    expect(
      importCounts(
        [
          { ...source, status: 'succeeded' },
          { ...source, id: 'failed', status: 'failed' },
          { ...source, id: 'invalid', validation: 'invalid' },
        ],
        2,
      ),
    ).toEqual({ imported: 1, failed: 1, skipped: 3 })
    expect(
      buildEbookPayload({
        row: { ...source, uploadedPath: undefined },
        category: 'Faith',
        isPublished: false,
      }).url,
    ).toBe('')
  })
})
