export const PRIVATE_STORAGE_BUCKETS = [
  'avatars',
  'course-thumbnails',
  'media-library',
  'media-thumbnails',
] as const

export type PrivateStorageBucket = (typeof PRIVATE_STORAGE_BUCKETS)[number]

export const SIGNED_VIEW_TTL_SECONDS = 60 * 60

export function extractPrivateStoragePath(
  value: string | null | undefined,
  bucket: PrivateStorageBucket,
): string | null {
  const candidate = value?.trim()
  if (!candidate) return null

  const marker = `/storage/v1/object/`
  const markerIndex = candidate.indexOf(marker)
  if (markerIndex === -1) {
    return candidate.includes('://') || candidate.includes('?')
      ? null
      : candidate
  }

  const afterMarker = candidate.slice(markerIndex + marker.length)
  const bucketMarker = new RegExp(
    `^(?:public|sign|authenticated)/${bucket}/([^?]+)`,
  )
  return afterMarker.match(bucketMarker)?.[1] ?? null
}

export function isOwnedStoragePath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`) || path.startsWith(`${userId}-`)
}

export function buildOwnedStoragePath(
  userId: string,
  extension: string,
  nowMs: number,
  nonce: string,
): string {
  return `${userId}/${nowMs}-${nonce}.${extension}`
}
