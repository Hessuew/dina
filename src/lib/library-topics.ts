export const LIBRARY_TOPICS = [
  "Biography of God's Generals",
  'Church Growth',
  'Demons and Deliverance',
  'Evangelism & Gospel Missions',
  'Faith',
  'Finance',
  'Gifts of the Spirit',
  'Healing',
  'Holy Spirit',
  'Kingdom',
  'Lectures',
  'Marriage',
  'Miracles',
  'Prayer',
  'Prophetic Christian Literatures',
  'Repentance from sin',
  'Revival',
  'Spiritual Growth',
  'Spiritual Warfare',
  'Triumphant church',
  'Wisdom',
] as const

export type LibraryTopic = (typeof LIBRARY_TOPICS)[number]

export const LEGACY_LIBRARY_TOPICS = ["God's Generals Biography"] as const
type LegacyLibraryTopic = (typeof LEGACY_LIBRARY_TOPICS)[number]

const LEGACY_TOPIC_ALIASES: Record<LegacyLibraryTopic, LibraryTopic> = {
  "God's Generals Biography": "Biography of God's Generals",
}

export function isLibraryTopic(value: string): value is LibraryTopic {
  return (LIBRARY_TOPICS as ReadonlyArray<string>).includes(value)
}

export function canonicalizeLibraryTopic(value: string): LibraryTopic | null {
  if (isLibraryTopic(value)) return value
  return (LEGACY_TOPIC_ALIASES as Record<string, LibraryTopic>)[value] ?? null
}

export type GroupableMedia = {
  category: string
  fileType: string
  allowsDownload?: boolean
}

export type LibraryShelfBuckets<T> = {
  lectures: Array<T>
  ebooks: Array<T>
  audioVisual: Array<T>
}

function emptyShelfBuckets<T>(): LibraryShelfBuckets<T> {
  return { lectures: [], ebooks: [], audioVisual: [] }
}

export function buildShelves<T extends GroupableMedia>(
  media: ReadonlyArray<T>,
): Map<string, LibraryShelfBuckets<T>> {
  const shelves = new Map<string, LibraryShelfBuckets<T>>()
  for (const item of media) {
    const topic = canonicalizeLibraryTopic(item.category)
    if (!topic) continue
    if (!shelves.has(topic)) {
      shelves.set(topic, emptyShelfBuckets())
    }
    const shelf = shelves.get(topic)!
    if (item.fileType === 'document') {
      if (item.allowsDownload) shelf.lectures.push(item)
      else shelf.ebooks.push(item)
    } else if (
      item.fileType === 'video' ||
      item.fileType === 'video_file' ||
      item.fileType === 'audio'
    ) {
      shelf.audioVisual.push(item)
    }
  }
  return shelves
}

export function shelfHasContent<T>(shelf: LibraryShelfBuckets<T>): boolean {
  return (
    shelf.lectures.length > 0 ||
    shelf.ebooks.length > 0 ||
    shelf.audioVisual.length > 0
  )
}
