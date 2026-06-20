import { describe, expect, it } from 'vitest'
import type { MediaLibraryRow } from '@/utils/library/library'
import {
  computeOpenResetState,
  getDocumentFileVariant,
  getFilenameFromUrl,
  getMediaDialogChrome,
  getMediaLoadingLabel,
  getThumbnailPreviewSrc,
  isMediaDialogSubmitting,
} from './media-dialog.domain'

const docMedia = {
  id: 'media-1',
  fileType: 'document',
  fileUrl: 'https://cdn/docs/lesson.pdf',
  thumbnailUrl: 'https://cdn/thumbs/lesson.png',
} as unknown as MediaLibraryRow

const videoMedia = {
  id: 'media-2',
  fileType: 'youtube',
  fileUrl: null,
  thumbnailUrl: null,
} as unknown as MediaLibraryRow

describe('getFilenameFromUrl', () => {
  it('extracts the trailing path segment', () => {
    expect(getFilenameFromUrl('https://cdn/docs/lesson.pdf')).toBe('lesson.pdf')
  })

  it('strips query strings before extracting the filename', () => {
    expect(getFilenameFromUrl('https://cdn/docs/lesson.pdf?token=abc')).toBe(
      'lesson.pdf',
    )
  })

  it('falls back to the original url when there is no path segment', () => {
    expect(getFilenameFromUrl('lesson.pdf')).toBe('lesson.pdf')
  })
})

describe('getDocumentFileVariant', () => {
  it('returns "picked" when a file is picked, regardless of existing doc', () => {
    expect(
      getDocumentFileVariant({ hasPickedFile: true, hasExistingDoc: true }),
    ).toBe('picked')
  })

  it('returns "existing" when no picked file but an existing doc', () => {
    expect(
      getDocumentFileVariant({ hasPickedFile: false, hasExistingDoc: true }),
    ).toBe('existing')
  })

  it('returns "empty" when neither picked nor existing', () => {
    expect(
      getDocumentFileVariant({ hasPickedFile: false, hasExistingDoc: false }),
    ).toBe('empty')
  })
})

describe('getThumbnailPreviewSrc', () => {
  it('prefers freshly picked file data', () => {
    expect(
      getThumbnailPreviewSrc({ fileData: 'data:img', thumbnailUrl: 'url' }),
    ).toBe('data:img')
  })

  it('falls back to the existing thumbnail url', () => {
    expect(
      getThumbnailPreviewSrc({ fileData: null, thumbnailUrl: 'url' }),
    ).toBe('url')
  })

  it('returns null when neither is present', () => {
    expect(
      getThumbnailPreviewSrc({ fileData: null, thumbnailUrl: null }),
    ).toBeNull()
  })
})

describe('computeOpenResetState', () => {
  it('exposes the existing doc url when editing a document', () => {
    expect(computeOpenResetState({ mode: 'edit', media: docMedia })).toEqual({
      existingDocUrl: 'https://cdn/docs/lesson.pdf',
      thumbnailUrl: 'https://cdn/thumbs/lesson.png',
    })
  })

  it('omits the existing doc url for a non-document edit', () => {
    expect(computeOpenResetState({ mode: 'edit', media: videoMedia })).toEqual({
      existingDocUrl: null,
      thumbnailUrl: null,
    })
  })

  it('omits the existing doc url in create mode even for a document', () => {
    expect(computeOpenResetState({ mode: 'create', media: docMedia })).toEqual({
      existingDocUrl: null,
      thumbnailUrl: 'https://cdn/thumbs/lesson.png',
    })
  })

  it('handles a missing media row', () => {
    expect(computeOpenResetState({ mode: 'edit', media: undefined })).toEqual({
      existingDocUrl: null,
      thumbnailUrl: null,
    })
  })
})

describe('getMediaDialogChrome', () => {
  it('returns create chrome', () => {
    expect(getMediaDialogChrome('create')).toEqual({
      title: 'Create Media',
      subtitle: 'Add a new item to the library',
      submitLabel: 'Create Media',
    })
  })

  it('returns edit chrome', () => {
    expect(getMediaDialogChrome('edit')).toEqual({
      title: 'Edit Media',
      subtitle: 'Update this library item',
      submitLabel: 'Save Changes',
    })
  })
})

describe('getMediaLoadingLabel', () => {
  it('returns the uploading label while uploading', () => {
    expect(getMediaLoadingLabel(true)).toBe('Uploading...')
  })

  it('returns undefined when not uploading', () => {
    expect(getMediaLoadingLabel(false)).toBeUndefined()
  })
})

describe('isMediaDialogSubmitting', () => {
  it('is true when a mutation is pending', () => {
    expect(
      isMediaDialogSubmitting({
        isAnyPending: true,
        isDocUploading: false,
        isThumbUploading: false,
      }),
    ).toBe(true)
  })

  it('is true while a document upload is in flight', () => {
    expect(
      isMediaDialogSubmitting({
        isAnyPending: false,
        isDocUploading: true,
        isThumbUploading: false,
      }),
    ).toBe(true)
  })

  it('is true while a thumbnail upload is in flight', () => {
    expect(
      isMediaDialogSubmitting({
        isAnyPending: false,
        isDocUploading: false,
        isThumbUploading: true,
      }),
    ).toBe(true)
  })

  it('is false when nothing is pending or uploading', () => {
    expect(
      isMediaDialogSubmitting({
        isAnyPending: false,
        isDocUploading: false,
        isThumbUploading: false,
      }),
    ).toBe(false)
  })
})
