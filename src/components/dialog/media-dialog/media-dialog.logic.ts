import { toast } from 'sonner'
import type { useFileUpload } from '@/hooks/useFileUpload'
import {
  requestMediaVideoUploadFn,
  uploadMediaThumbnailFn,
} from '@/utils/library/library'
import { toUserError } from '@/utils/errors'

/**
 * Upload a freshly picked thumbnail for a saved media row, if one is staged.
 * Glue around the thumbnail upload server fn + toast; no-op when nothing is
 * picked. Errors are surfaced as a toast, never thrown.
 */
export async function uploadThumbnailIfPresent(
  thumbUpload: ReturnType<typeof useFileUpload>,
  mediaId: string,
): Promise<void> {
  if (!thumbUpload.fileObject) return
  try {
    await uploadMediaThumbnailFn({
      data: {
        mediaId,
        fileData: thumbUpload.fileData!,
        fileName: thumbUpload.fileObject.name,
        fileType: thumbUpload.fileObject.type,
        fileSize: thumbUpload.fileObject.size,
      },
    })
  } catch (error) {
    toast.error(toUserError(error).message)
  }
}

/**
 * Request a signed upload URL, PUT the file directly to Storage, return the
 * public object URL to store on the media row. Bytes never pass through the app
 * server (100MB-capable path).
 */
export async function uploadVideoFileDirect(file: File): Promise<{
  fileUrl: string
  fileSize: number
}> {
  const signed = await requestMediaVideoUploadFn({
    data: {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    },
  })

  // Match storage-js uploadToSignedUrl body shape for Blob/File (FormData + PUT).
  const body = new FormData()
  body.append('cacheControl', '3600')
  body.append('', file)

  const put = await fetch(signed.signedUrl, {
    method: 'PUT',
    headers: {
      'x-upsert': 'false',
    },
    body,
  })

  if (!put.ok) {
    throw new Error(`Video upload failed (${put.status})`)
  }

  return { fileUrl: signed.fileUrl, fileSize: file.size }
}
