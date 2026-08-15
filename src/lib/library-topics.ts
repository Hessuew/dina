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
  return (LIBRARY_TOPICS as ReadonlyArray<string>).includes(value)
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
    if (!isLibraryTopic(item.category)) continue
    if (!shelves.has(item.category)) {
      shelves.set(item.category, emptyShelfBuckets())
    }
    const shelf = shelves.get(item.category)!
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
