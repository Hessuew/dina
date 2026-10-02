export const LIBRARY_RECENT_CAP = 12
export const LIBRARY_STARS_CAP = 100

export type LibraryPrefs = {
  /** Media ids, most recently starred first. */
  stars: Array<string>
  /** Media ids, most recently viewed first. */
  recent: Array<string>
  /** mediaId -> last read page (1-based). */
  positions: Record<string, number>
}

export function libraryPrefsKey(userId: string): string {
  return `dina:library:${userId}:prefs`
}

export function emptyLibraryPrefs(): LibraryPrefs {
  return { stars: [], recent: [], positions: {} }
}

function asIdList(value: unknown, cap: number): Array<string> {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const ids: Array<string> = []
  for (const item of value) {
    if (typeof item !== 'string' || !item || seen.has(item)) continue
    seen.add(item)
    ids.push(item)
    if (ids.length >= cap) break
  }
  return ids
}

function asPositions(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }
  const positions: Record<string, number> = {}
  for (const [key, page] of Object.entries(value)) {
    if (typeof page === 'number' && Number.isInteger(page) && page > 1) {
      positions[key] = page
    }
  }
  return positions
}

export function parseLibraryPrefs(raw: string | null): LibraryPrefs {
  if (!raw) return emptyLibraryPrefs()
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return emptyLibraryPrefs()
    }
    const record = value as Record<string, unknown>
    return {
      stars: asIdList(record.stars, LIBRARY_STARS_CAP),
      recent: asIdList(record.recent, LIBRARY_RECENT_CAP),
      positions: asPositions(record.positions),
    }
  } catch {
    return emptyLibraryPrefs()
  }
}

export function serializeLibraryPrefs(prefs: LibraryPrefs): string {
  return JSON.stringify(prefs)
}

export function isMediaStarred(prefs: LibraryPrefs, mediaId: string): boolean {
  return prefs.stars.includes(mediaId)
}

export function toggleMediaStar(
  prefs: LibraryPrefs,
  mediaId: string,
): LibraryPrefs {
  const stars = prefs.stars.includes(mediaId)
    ? prefs.stars.filter((id) => id !== mediaId)
    : [mediaId, ...prefs.stars].slice(0, LIBRARY_STARS_CAP)
  return { ...prefs, stars }
}

export function recordMediaView(
  prefs: LibraryPrefs,
  mediaId: string,
): LibraryPrefs {
  return {
    ...prefs,
    recent: [mediaId, ...prefs.recent.filter((id) => id !== mediaId)].slice(
      0,
      LIBRARY_RECENT_CAP,
    ),
  }
}

export function setReadingPosition(
  prefs: LibraryPrefs,
  mediaId: string,
  page: number,
): LibraryPrefs {
  if (!Number.isInteger(page)) return prefs
  const positions = { ...prefs.positions }
  if (page <= 1) {
    delete positions[mediaId]
  } else {
    positions[mediaId] = page
  }
  return { ...prefs, positions }
}
