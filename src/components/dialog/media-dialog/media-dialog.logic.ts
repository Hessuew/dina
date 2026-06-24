import { toast } from 'sonner'
import type { useFileUpload } from '@/hooks/useFileUpload'
import { uploadMediaThumbnailFn } from '@/utils/library/library'
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
