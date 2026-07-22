import { describe, expect, it } from 'vitest'
import {
  buildMediaPayload,
  buildPdfUploadData,
  computeOpenResetState,
  emptyFormData,
  fromFileType,
  getDocumentFileVariant,
  getFilenameFromUrl,
  getInitialValues,
  getMediaDialogChrome,
  getMediaLoadingLabel,
  getThumbnailPreviewSrc,
  isMediaDialogSubmitting,
  preflightDocumentUrl,
  preflightVideoUrl,
  resolveDocumentUploadResult,
} from './media-dialog.domain'
import type { MediaLibraryRow } from '@/utils/library/library'

const docMedia = {
  id: 'media-1',
  fileType: 'document',
  fileUrl: 'https://cdn/docs/lesson.pdf',
  thumbnailUrl: 'https://cdn/thumbs/lesson.png',
  title: 'Lesson Doc',
  category: 'Faith',
  description: 'A lesson document',
  isPublished: true,
} as unknown as MediaLibraryRow

const videoMedia = {
  id: 'media-2',
  fileType: 'video',
  fileUrl: null,
  thumbnailUrl: null,
  title: 'Video Title',
  category: 'Music',
  description: null,
  isPublished: false,
} as unknown as MediaLibraryRow

describe('fromFileType', () => {
  it('maps document to document', () => {
    expect(fromFileType('document')).toBe('document')
  })

  it('maps video to youtube', () => {
    expect(fromFileType('video')).toBe('youtube')
  })

  it('maps video_file to video-file', () => {
    expect(fromFileType('video_file')).toBe('video-file')
  })

  it('maps audio to youtube', () => {
    expect(fromFileType('audio')).toBe('youtube')
  })
})

describe('getInitialValues', () => {
  it('returns empty form with youtube kind when creating without courseId', () => {
    expect(getInitialValues(undefined, 'create', undefined)).toEqual({
      ...emptyFormData,
      kind: 'youtube',
    })
  })

  it('returns empty form with document kind when creating with courseId', () => {
    expect(getInitialValues(undefined, 'create', 'course-1')).toEqual({
      ...emptyFormData,
      kind: 'document',
    })
  })

  it('ignores media in create mode and returns empty form', () => {
    expect(getInitialValues(docMedia, 'create', undefined)).toEqual({
      ...emptyFormData,
      kind: 'youtube',
    })
  })

  it('returns empty form in delete mode', () => {
    expect(getInitialValues(undefined, 'delete', undefined)).toEqual({
      ...emptyFormData,
      kind: 'youtube',
    })
  })

  it('populates from media in edit mode for a document', () => {
    expect(getInitialValues(docMedia, 'edit', undefined)).toEqual({
      title: 'Lesson Doc',
      category: 'Faith',
      description: 'A lesson document',
      kind: 'document',
      url: '',
      isPublished: true,
    })
  })

  it('populates from media in edit mode for a video', () => {
    expect(getInitialValues(videoMedia, 'edit', undefined)).toEqual({
      title: 'Video Title',
      category: 'Music',
      description: '',
      kind: 'youtube',
      url: '',
      isPublished: false,
    })
  })

  it('converts null description to empty string', () => {
    const result = getInitialValues(videoMedia, 'edit', undefined)
    expect(result.description).toBe('')
  })
})

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
      existingVideoUrl: null,
      thumbnailUrl: 'https://cdn/thumbs/lesson.png',
    })
  })

  it('omits the existing doc url for a non-document edit', () => {
    expect(computeOpenResetState({ mode: 'edit', media: videoMedia })).toEqual({
      existingDocUrl: null,
      existingVideoUrl: null,
      thumbnailUrl: null,
    })
  })

  it('exposes existing video url when editing a video_file', () => {
    const videoFileMedia = {
      ...videoMedia,
      fileType: 'video_file',
      fileUrl: 'https://cdn/media/u-1.mp4',
      thumbnailUrl: 'https://cdn/thumbs/v.png',
    } as unknown as MediaLibraryRow
    expect(
      computeOpenResetState({ mode: 'edit', media: videoFileMedia }),
    ).toEqual({
      existingDocUrl: null,
      existingVideoUrl: 'https://cdn/media/u-1.mp4',
      thumbnailUrl: 'https://cdn/thumbs/v.png',
    })
  })

  it('omits the existing doc url in create mode even for a document', () => {
    expect(computeOpenResetState({ mode: 'create', media: docMedia })).toEqual({
      existingDocUrl: null,
      existingVideoUrl: null,
      thumbnailUrl: 'https://cdn/thumbs/lesson.png',
    })
  })

  it('handles a missing media row', () => {
    expect(computeOpenResetState({ mode: 'edit', media: undefined })).toEqual({
      existingDocUrl: null,
      existingVideoUrl: null,
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
        isVideoUploading: false,
        isThumbUploading: false,
      }),
    ).toBe(true)
  })

  it('is true while a document upload is in flight', () => {
    expect(
      isMediaDialogSubmitting({
        isAnyPending: false,
        isDocUploading: true,
        isVideoUploading: false,
        isThumbUploading: false,
      }),
    ).toBe(true)
  })

  it('is true while a video upload is in flight', () => {
    expect(
      isMediaDialogSubmitting({
        isAnyPending: false,
        isDocUploading: false,
        isVideoUploading: true,
        isThumbUploading: false,
      }),
    ).toBe(true)
  })

  it('is true while a thumbnail upload is in flight', () => {
    expect(
      isMediaDialogSubmitting({
        isAnyPending: false,
        isDocUploading: false,
        isVideoUploading: false,
        isThumbUploading: true,
      }),
    ).toBe(true)
  })

  it('is false when nothing is pending or uploading', () => {
    expect(
      isMediaDialogSubmitting({
        isAnyPending: false,
        isDocUploading: false,
        isVideoUploading: false,
        isThumbUploading: false,
      }),
    ).toBe(false)
  })
})

describe('preflightDocumentUrl', () => {
  it('returns null when a file is picked (upload should proceed)', () => {
    expect(
      preflightDocumentUrl({ hasFile: true, existingDocUrl: null }),
    ).toBeNull()
  })

  it('returns null when a file is picked even if an existing doc is present', () => {
    expect(
      preflightDocumentUrl({
        hasFile: true,
        existingDocUrl: 'https://cdn/old.pdf',
      }),
    ).toBeNull()
  })

  it('returns existing url when no file but existing doc is present', () => {
    expect(
      preflightDocumentUrl({
        hasFile: false,
        existingDocUrl: 'https://cdn/old.pdf',
      }),
    ).toEqual({ ok: true, url: 'https://cdn/old.pdf' })
  })

  it('returns error when no file and no existing doc', () => {
    expect(
      preflightDocumentUrl({ hasFile: false, existingDocUrl: null }),
    ).toEqual({ ok: false, message: 'Please upload a document file' })
  })
})

describe('preflightVideoUrl', () => {
  it('returns null when a file is picked', () => {
    expect(
      preflightVideoUrl({ hasFile: true, existingVideoUrl: null }),
    ).toBeNull()
  })

  it('returns existing url when no file but existing video present', () => {
    expect(
      preflightVideoUrl({
        hasFile: false,
        existingVideoUrl: 'https://cdn/old.mp4',
      }),
    ).toEqual({ ok: true, url: 'https://cdn/old.mp4' })
  })

  it('returns error when no file and no existing video', () => {
    expect(
      preflightVideoUrl({ hasFile: false, existingVideoUrl: null }),
    ).toEqual({ ok: false, message: 'Please upload a video file' })
  })
})

describe('resolveDocumentUploadResult', () => {
  it('returns the uploaded fileUrl and fileSize when upload returns a url', () => {
    expect(
      resolveDocumentUploadResult({
        fileUrl: 'https://cdn/new.pdf',
        currentUrl: 'https://cdn/current.pdf',
        fileSize: 1024,
      }),
    ).toEqual({ ok: true, url: 'https://cdn/new.pdf', fileSize: 1024 })
  })

  it('falls back to currentUrl when upload returns no fileUrl', () => {
    expect(
      resolveDocumentUploadResult({
        fileUrl: undefined,
        currentUrl: 'https://cdn/current.pdf',
        fileSize: 1024,
      }),
    ).toEqual({ ok: true, url: 'https://cdn/current.pdf' })
  })
})

describe('buildPdfUploadData', () => {
  const base = {
    fileData: 'base64data',
    fileName: 'lesson.pdf',
    fileType: 'application/pdf',
    fileSize: 2048,
  }

  it('omits mediaId in create mode', () => {
    expect(
      buildPdfUploadData({ ...base, mode: 'create', media: undefined }),
    ).toEqual(base)
  })

  it('includes mediaId when editing an existing media row', () => {
    expect(
      buildPdfUploadData({ ...base, mode: 'edit', media: docMedia }),
    ).toEqual({ ...base, mediaId: 'media-1' })
  })

  it('omits mediaId when editing but media is undefined', () => {
    expect(
      buildPdfUploadData({ ...base, mode: 'edit', media: undefined }),
    ).toEqual(base)
  })
})

describe('buildMediaPayload', () => {
  const value = {
    title: 'My Video',
    category: 'Faith',
    description: 'A summary',
    kind: 'youtube' as const,
    url: 'https://youtube.com/watch?v=abc',
    isPublished: true,
  }

  it('maps all fields from the form value', () => {
    expect(
      buildMediaPayload({
        value,
        url: value.url,
        fileSize: undefined,
        courseId: 'c1',
      }),
    ).toEqual({
      title: 'My Video',
      category: 'Faith',
      description: 'A summary',
      kind: 'youtube',
      url: 'https://youtube.com/watch?v=abc',
      isPublished: true,
      fileSize: undefined,
      courseId: 'c1',
    })
  })

  it('converts empty description to undefined', () => {
    const result = buildMediaPayload({
      value: { ...value, description: '' },
      url: value.url,
      fileSize: undefined,
      courseId: undefined,
    })
    expect(result.description).toBeUndefined()
  })

  it('passes through url and fileSize from params, not value.url', () => {
    const result = buildMediaPayload({
      value: { ...value, url: 'old-url' },
      url: 'resolved-url',
      fileSize: 4096,
      courseId: undefined,
    })
    expect(result.url).toBe('resolved-url')
    expect(result.fileSize).toBe(4096)
  })
})
