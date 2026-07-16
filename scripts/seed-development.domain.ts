export type SeedBucketSpec = {
  id: string
  public: boolean
}

export const DEVELOPMENT_STORAGE_BUCKETS: ReadonlyArray<SeedBucketSpec> = [
  { id: 'avatars', public: true },
  { id: 'course-thumbnails', public: true },
  { id: 'media-library', public: false },
]

export const MAX_USER_LIST_PAGES = 20
export const USERS_PER_PAGE = 1000

export function findUserInPage<T extends { email?: string | null }>(
  users: ReadonlyArray<T>,
  email: string,
): T | undefined {
  return users.find((candidate) => candidate.email === email)
}

export function shouldContinueUserSearch(pageSize: number): boolean {
  return pageSize >= USERS_PER_PAGE
}

export function isUserListPageExhausted(page: number): boolean {
  return page > MAX_USER_LIST_PAGES
}

/** Outcome of scanning one auth admin user page for an email match. */
export function resolveUserPageScan<T extends { email?: string | null }>(
  users: ReadonlyArray<T>,
  email: string,
): { done: true; user: T | undefined } | { done: false } {
  const user = findUserInPage(users, email)
  if (user) return { done: true, user }
  if (!shouldContinueUserSearch(users.length)) {
    return { done: true, user: undefined }
  }
  return { done: false }
}

export function bucketsToEnsure(
  existingIds: ReadonlyArray<string>,
  desired: ReadonlyArray<SeedBucketSpec> = DEVELOPMENT_STORAGE_BUCKETS,
): {
  create: Array<SeedBucketSpec>
  update: Array<SeedBucketSpec>
} {
  const existing = new Set(existingIds)
  const create: Array<SeedBucketSpec> = []
  const update: Array<SeedBucketSpec> = []
  for (const bucket of desired) {
    if (existing.has(bucket.id)) update.push(bucket)
    else create.push(bucket)
  }
  return { create, update }
}
