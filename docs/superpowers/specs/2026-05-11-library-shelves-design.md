# Library Shelves Design

**Date:** 2026-05-11  
**Status:** Approved

## Context

The library page currently shows all media as a flat DataTable with no categorization UI. This makes it hard to discover content by topic. The goal is to reorganize the library into topic-based shelves to improve content discovery and navigation.

## Requirements

- Topic shelves are the primary navigation unit; eBooks and Audio-Visual are sub-sections within each topic
- Shelf layout: Netflix-style horizontal scroll rows per sub-section
- All shelves visible on a single scrolling page (no drill-in or tab navigation)
- Topics are hard-coded in the app (not admin-managed)
- Items whose `category` is not in the predefined topic list are hidden from shelf view
- Admins retain access to the full DataTable (for managing uncategorized and all items)
- MediaDialog category field changes from free-text input to a predefined topic dropdown

## Topic List

Hard-coded in order (constant `LIBRARY_TOPICS`):

1. Wisdom
2. Healing
3. Miracles
4. Kingdom
5. Faith
6. Marriage
7. Finance
8. Church Growth
9. God's Generals Biography
10. Spiritual Warfare

## Media Type Mapping

- **eBooks** → `fileType: 'document'` (PDF uploads)
- **Audio-Visual** → `fileType: 'video'` | `fileType: 'audio'` (YouTube links, audio)

## Architecture

```
src/
├── lib/
│   └── library-topics.ts          NEW — LIBRARY_TOPICS constant + LibraryTopic type
├── components/library/
│   ├── LibraryShelf.tsx            NEW — topic shelf (heading + eBooks row + AV row)
│   └── MediaCard.tsx               NEW — single item card (thumbnail, title, badge)
├── components/dialog/
│   └── MediaDialog.tsx             EDIT — category text input → topic Select dropdown
├── schemas/
│   └── media.schema.ts             EDIT — category validated against LIBRARY_TOPICS
└── routes/_authed/library/
    └── index.tsx                   EDIT — replace DataTable with shelves + admin table
```

## Data Flow

1. `getLibraryMedia()` (existing, no changes) fetches all accessible media
2. Library index groups results client-side:
   ```ts
   type ShelfData = {
     ebooks: MediaLibraryRow[]
     audioVisual: MediaLibraryRow[]
   }
   const shelves = new Map<string, ShelfData>()
   // items with category not in LIBRARY_TOPICS are excluded
   ```
3. Page iterates `LIBRARY_TOPICS` in order; skips topics with zero items
4. Renders `<LibraryShelf>` per topic with non-empty items
5. Below shelves, admins see the full existing `<DataTable>` (all items, including uncategorized)

## Component Details

### `src/lib/library-topics.ts`

```ts
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
```

### `LibraryShelf`

Props: `topic: string`, `ebooks: MediaLibraryRow[]`, `audioVisual: MediaLibraryRow[]`

Renders:

- Gold eyebrow decoration + serif topic heading (follows existing page header pattern)
- "eBooks" sub-label + horizontal scroll row of `<MediaCard>` — only if `ebooks.length > 0`
- "Audio-Visual" sub-label + horizontal scroll row of `<MediaCard>` — only if `audioVisual.length > 0`

### `MediaCard`

Props: `item: MediaLibraryRow`

Renders:

- Thumbnail: YouTube preview image (`https://img.youtube.com/vi/<videoId>/mqdefault.jpg`) for videos; book icon for PDFs
- Title (truncated)
- Published badge — hidden from students (role check via existing auth context)
- File type badge (PDF, Video) — shown to all users
- Topic badge (from category) — shown to all users
- Clicking card navigates to existing `/library/$mediaId` detail page

### `MediaDialog` changes

- Category `<Input type="text">` → `<Select>` populated from `LIBRARY_TOPICS`
- Existing `category` field in form schema updated to `z.enum(LIBRARY_TOPICS)`

## Error Handling & Edge Cases

- `getLibraryMedia()` failure: caught by TanStack Router error boundary (no new handling)
- No items in any topic: show existing `<EmptyState>` component
- Topic with items in only one sub-type: omit empty sub-section row (no empty headings shown)
- Uncategorized items: excluded from shelf view; visible to admins in DataTable only

## Verification Plan

1. Add a media item with category "Wisdom" + fileType "document" → appears in Wisdom eBooks row
2. Add a media item with category "Wisdom" + fileType "video" → appears in Wisdom Audio-Visual row
3. Add a media item with category "General" → not visible in shelves; admin sees it in DataTable
4. Open MediaDialog as teacher/admin → category field shows 10-item dropdown
5. Submit form with topic selected → item saved with correct category
6. Student role view → no DataTable shown, no unpublished badges on cards
7. Existing `/library/$mediaId` detail page still works when navigating from a card
