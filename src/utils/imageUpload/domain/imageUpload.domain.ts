import { ValidationError } from '@/utils/errors'

const IMAGE_MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

export function validateImageUpload(fileSize: number, fileType: string): void {
  if (fileSize > IMAGE_MAX_SIZE) {
    throw new ValidationError('File size must be less than 2MB', {
      details: { fileSize, maxSize: IMAGE_MAX_SIZE },
    })
  }
  if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
    throw new ValidationError(
      'Only JPEG, PNG, WebP, and GIF images are allowed',
      {
        details: { fileType },
      },
    )
  }
}

export function resolveFileExtension(
  fileType: string,
  originalName: string,
): string {
  if (fileType === 'image/webp') {
    return 'webp'
  }
  return originalName.slice(originalName.lastIndexOf('.') + 1)
}

export function decodeBase64DataUrl(fileData: string): Buffer {
  const commaIndex = fileData.indexOf(',')
  const base64Data =
    commaIndex !== -1 ? fileData.slice(commaIndex + 1) : fileData
  if (!base64Data) {
    throw new ValidationError('Invalid file data: missing base64 content')
  }
  return Buffer.from(base64Data, 'base64')
}

export function extractStorageObjectName(url: string): string | undefined {
  return url.split('/').pop()?.split('?')[0]
}
