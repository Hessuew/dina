import type { PrivateStorageBucket } from '@/utils/storage/domain/private-storage.domain'
import { SIGNED_VIEW_TTL_SECONDS } from '@/utils/storage/domain/private-storage.domain'
import { AppError } from '@/utils/errors'
import { getSupabaseAdminClient } from '@/utils/supabase'

export type SignedUpload = {
  path: string
  token: string
  signedUrl: string
}

export async function createPrivateSignedUpload(
  bucket: PrivateStorageBucket,
  path: string,
): Promise<SignedUpload> {
  const admin = getSupabaseAdminClient()
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error) {
    throw new AppError({
      code: 'STORAGE_UPLOAD_FAILED',
      status: 502,
      userMessage: 'Failed to prepare file upload',
      internalMessage: error.message,
    })
  }
  return { path: data.path, token: data.token, signedUrl: data.signedUrl }
}

export async function signPrivateStoragePath(
  bucket: PrivateStorageBucket,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null
  const urls = await signPrivateStoragePaths(bucket, [path])
  return urls.get(path) ?? null
}

export async function signPrivateStoragePaths(
  bucket: PrivateStorageBucket,
  paths: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, string | null>> {
  const unique = Array.from(
    new Set(paths.filter((path): path is string => !!path)),
  )
  const result = new Map<string, string | null>()
  if (unique.length === 0) return result

  const admin = getSupabaseAdminClient()
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrls(unique, SIGNED_VIEW_TTL_SECONDS)

  if (error) {
    console.error('Failed to create signed storage URLs', {
      bucket,
      error: error.message,
    })
    for (const path of unique) result.set(path, null)
    return result
  }

  for (const item of data) {
    if (item.path) result.set(item.path, item.error ? null : item.signedUrl)
  }
  for (const path of unique) {
    if (!result.has(path)) result.set(path, null)
  }
  return result
}

export async function signAvatarRows<T extends { avatarUrl: string | null }>(
  rows: ReadonlyArray<T>,
): Promise<Array<T>> {
  const urls = await signPrivateStoragePaths(
    'avatars',
    rows.map((row) => row.avatarUrl),
  )
  return rows.map((row) => ({
    ...row,
    avatarUrl: urls.get(row.avatarUrl ?? '') ?? null,
  }))
}

export async function signCourseThumbnailRows<
  T extends { thumbnailUrl: string | null },
>(rows: ReadonlyArray<T>): Promise<Array<T>> {
  const urls = await signPrivateStoragePaths(
    'course-thumbnails',
    rows.map((row) => row.thumbnailUrl),
  )
  return rows.map((row) => ({
    ...row,
    thumbnailUrl: urls.get(row.thumbnailUrl ?? '') ?? null,
  }))
}
