export const LIBRARY_TOPICS = [
  'Wisdom',
  'Healing',
  'Miracles',
  'Kingdom',
  'Faith',
  'Marriage',
  'Finance',
  'Church Growth',
  "God's Generals Biography",
  'Spiritual Warfare',
] as const

export type LibraryTopic = (typeof LIBRARY_TOPICS)[number]

export function isLibraryTopic(value: string): value is LibraryTopic {
  return (LIBRARY_TOPICS as readonly string[]).includes(value)
}

export type GroupableMedia = { category: string; fileType: string }

export function buildShelves<T extends GroupableMedia>(
  media: readonly T[],
): Map<string, { ebooks: T[]; audioVisual: T[] }> {
  const shelves = new Map<string, { ebooks: T[]; audioVisual: T[] }>()
  for (const item of media) {
    if (!isLibraryTopic(item.category)) continue
    if (!shelves.has(item.category)) {
      shelves.set(item.category, { ebooks: [], audioVisual: [] })
    }
    const shelf = shelves.get(item.category)!
    if (item.fileType === 'document') {
      shelf.ebooks.push(item)
    } else if (item.fileType === 'video' || item.fileType === 'audio') {
      shelf.audioVisual.push(item)
    }
  }
  return shelves
}
