import { toast } from 'sonner'
import type { useFileUpload } from '@/hooks/useFileUpload'
import {
  requestMediaFileUploadFn,
  requestMediaThumbnailUploadFn,
  uploadMediaThumbnailFn,
} from '@/utils/library/library'
import { toUserError } from '@/utils/errors'
import { putFileToSignedUrl } from '@/utils/storage/private-upload'

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
    const file = thumbUpload.fileObject
    const signed = await requestMediaThumbnailUploadFn({
      data: {
        mediaId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      },
    })
    await putFileToSignedUrl(file, signed.signedUrl)
    await uploadMediaThumbnailFn({ data: { mediaId, path: signed.path } })
  } catch (error) {
    toast.error(toUserError(error).message)
  }
}

/**
 * Request a signed upload URL, PUT the file directly to Storage, return the
 * canonical object path to store on the media row.
 */
export async function uploadMediaFileDirect(
  file: File,
  kind: 'document' | 'video-file',
): Promise<{
  fileUrl: string
  fileSize: number
}> {
  const signed = await requestMediaFileUploadFn({
    data: {
      kind,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    },
  })

  await putFileToSignedUrl(file, signed.signedUrl)
  return { fileUrl: signed.path, fileSize: file.size }
}
