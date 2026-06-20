import type { MediaLibraryRow } from '@/utils/library/library'

type MediaDialogMode = 'create' | 'edit' | 'delete'

export function getFilenameFromUrl(url: string): string {
  // `.split('/')` always yields a non-empty array, so `.pop()` is defined.
  return url.split('?')[0].split('/').pop()!
}

export type DocumentFileVariant = 'picked' | 'existing' | 'empty'

export function getDocumentFileVariant(params: {
  hasPickedFile: boolean
  hasExistingDoc: boolean
}): DocumentFileVariant {
  if (params.hasPickedFile) return 'picked'
  if (params.hasExistingDoc) return 'existing'
  return 'empty'
}

export function getThumbnailPreviewSrc(params: {
  fileData: string | null
  thumbnailUrl: string | null
}): string | null {
  return params.fileData || params.thumbnailUrl || null
}

export type MediaOpenResetState = {
  existingDocUrl: string | null
  thumbnailUrl: string | null
}

export function computeOpenResetState(params: {
  mode: MediaDialogMode
  media: MediaLibraryRow | undefined
}): MediaOpenResetState {
  const { mode, media } = params
  const isDocEdit = mode === 'edit' && media?.fileType === 'document'
  return {
    // `isDocEdit` narrows `media` to defined here.
    existingDocUrl: isDocEdit ? media.fileUrl : null,
    thumbnailUrl: media?.thumbnailUrl ?? null,
  }
}

export type MediaDialogChrome = {
  title: string
  subtitle: string
  submitLabel: string
}

export function getMediaDialogChrome(mode: 'create' | 'edit'): MediaDialogChrome {
  if (mode === 'create') {
    return {
      title: 'Create Media',
      subtitle: 'Add a new item to the library',
      submitLabel: 'Create Media',
    }
  }
  return {
    title: 'Edit Media',
    subtitle: 'Update this library item',
    submitLabel: 'Save Changes',
  }
}

export function getMediaLoadingLabel(isUploading: boolean): string | undefined {
  return isUploading ? 'Uploading...' : undefined
}

export function isMediaDialogSubmitting(params: {
  isAnyPending: boolean
  isDocUploading: boolean
  isThumbUploading: boolean
}): boolean {
  return (
    params.isAnyPending || params.isDocUploading || params.isThumbUploading
  )
}
