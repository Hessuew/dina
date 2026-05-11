# Library Shelves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat library DataTable with Netflix-style topic shelves (Wisdom, Healing, etc.) grouped into eBooks and Audio-Visual sub-sections, while keeping the DataTable for teacher/admin management.

**Architecture:** Client-side grouping — existing `getLibraryMedia()` is unchanged; `buildShelves()` groups the results by `category` (topic) and `fileType` (eBook vs Audio-Visual) on the client. Topics are hard-coded in `LIBRARY_TOPICS`. Items whose category is not in the list are hidden from shelf view but visible in the admin DataTable below.

**Tech Stack:** React, TanStack Router, TanStack Form, Zod v4, Tailwind CSS, Base UI, `@/components/ui/form-field` FormFieldSelect

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| **Create** | `src/lib/library-topics.ts` | LIBRARY_TOPICS constant, isLibraryTopic guard, buildShelves grouping function |
| **Create** | `src/lib/library-topics.test.ts` | Unit tests for isLibraryTopic and buildShelves |
| **Edit** | `src/schemas/media.schema.ts` | category field: `z.string()` → `z.enum(LIBRARY_TOPICS)` |
| **Create** | `src/components/library/MediaCard.tsx` | Single media card: thumbnail, title, type badge, published badge for non-students |
| **Create** | `src/components/library/LibraryShelf.tsx` | Topic shelf: gold heading + eBooks row + Audio-Visual row |
| **Edit** | `src/components/dialog/MediaDialog.tsx` | Category `<TextField>` → `<FormFieldSelect>` populated from LIBRARY_TOPICS |
| **Edit** | `src/routes/_authed/library/index.tsx` | Replace DataTable with shelf view; keep DataTable below for teachers/admins |

---

## Task 1: Create `src/lib/library-topics.ts`

**Files:**
- Create: `src/lib/library-topics.ts`
- Create: `src/lib/library-topics.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/library-topics.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { LIBRARY_TOPICS, buildShelves, isLibraryTopic } from './library-topics'

describe('isLibraryTopic', () => {
  it('returns true for every predefined topic', () => {
    for (const topic of LIBRARY_TOPICS) {
      expect(isLibraryTopic(topic)).toBe(true)
    }
  })

  it('returns false for unrecognized strings', () => {
    expect(isLibraryTopic('General')).toBe(false)
    expect(isLibraryTopic('')).toBe(false)
    expect(isLibraryTopic('wisdom')).toBe(false) // case-sensitive
  })
})

describe('buildShelves', () => {
  const media = [
    { id: '1', category: 'Wisdom', fileType: 'document' },
    { id: '2', category: 'Wisdom', fileType: 'video' },
    { id: '3', category: 'Wisdom', fileType: 'audio' },
    { id: '4', category: 'Healing', fileType: 'document' },
    { id: '5', category: 'General', fileType: 'document' }, // not a valid topic
    { id: '6', category: 'Wisdom', fileType: 'image' },     // not ebook or AV
  ] as const

  it('puts documents in ebooks', () => {
    const shelves = buildShelves(media)
    const wisdom = shelves.get('Wisdom')!
    expect(wisdom.ebooks.map((i) => i.id)).toEqual(['1'])
  })

  it('puts videos and audio in audioVisual', () => {
    const shelves = buildShelves(media)
    const wisdom = shelves.get('Wisdom')!
    expect(wisdom.audioVisual.map((i) => i.id)).toEqual(['2', '3'])
  })

  it('excludes items with fileType other than document/video/audio', () => {
    const shelves = buildShelves(media)
    const wisdom = shelves.get('Wisdom')!
    expect(wisdom.ebooks).toHaveLength(1)
    expect(wisdom.audioVisual).toHaveLength(2)
  })

  it('excludes items whose category is not a valid topic', () => {
    const shelves = buildShelves(media)
    expect(shelves.has('General')).toBe(false)
  })

  it('groups items across different topics independently', () => {
    const shelves = buildShelves(media)
    const healing = shelves.get('Healing')!
    expect(healing.ebooks).toHaveLength(1)
    expect(healing.audioVisual).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun test src/lib/library-topics.test.ts
```

Expected: `Error: Cannot find module './library-topics'`

- [ ] **Step 3: Create `src/lib/library-topics.ts`**

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

type GroupableMedia = { category: string; fileType: string }

export function buildShelves<T extends GroupableMedia>(
  media: T[],
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun test src/lib/library-topics.test.ts
```

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
gt c -m "feat: add LIBRARY_TOPICS constant and buildShelves grouping utility"
```

---

## Task 2: Update `src/schemas/media.schema.ts`

**Files:**
- Modify: `src/schemas/media.schema.ts`

- [ ] **Step 1: Update the category field to use the enum**

Replace the imports and `category` line in `src/schemas/media.schema.ts`:

```ts
import { z } from 'zod'
import { LIBRARY_TOPICS } from '@/lib/library-topics'

export const mediaKindEnum = z.enum(['youtube', 'pdf'])

export const createMediaSchema = z.object({
  title: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum(LIBRARY_TOPICS),
  isPublished: z.boolean().optional().default(false),
  kind: mediaKindEnum,
  url: z.string().min(1, 'URL is required'),
  fileSize: z.number().int().positive().optional(),
})

export const updateMediaSchema = createMediaSchema.extend({
  mediaId: z.uuid('Invalid media ID'),
})

export const deleteMediaSchema = z.object({
  mediaId: z.uuid('Invalid media ID'),
})

export const getMediaSchema = z.object({
  mediaId: z.uuid('Invalid media ID'),
})

export const uploadMediaPdfSchema = z.object({
  fileData: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  oldUrl: z.string().optional(),
})

export type CreateMediaInput = z.infer<typeof createMediaSchema>
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>
export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>
export type GetMediaInput = z.infer<typeof getMediaSchema>
export type UploadMediaPdfInput = z.infer<typeof uploadMediaPdfSchema>
```

- [ ] **Step 2: Check types compile**

```bash
bun run tsc --noEmit
```

Expected: No errors related to `media.schema.ts`. If TypeScript complains that `LIBRARY_TOPICS` is `readonly` and not assignable to `[string, ...string[]]`, change `z.enum(LIBRARY_TOPICS)` to `z.enum([...LIBRARY_TOPICS])`.

- [ ] **Step 3: Commit**

```bash
gt c -m "feat: restrict media category to predefined LIBRARY_TOPICS via z.enum"
```

---

## Task 3: Create `src/components/library/MediaCard.tsx`

**Files:**
- Create: `src/components/library/MediaCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Link } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'
import type { MediaLibraryRow } from '@/utils/library/library'

type MediaCardProps = {
  item: MediaLibraryRow
  viewerRole: 'student' | 'teacher' | 'admin'
}

function getYoutubeVideoId(url: string): string | null {
  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const u = new URL(normalized)
    if (u.hostname === 'youtu.be') return u.pathname.replace('/', '') || null
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return v
      if (u.pathname.startsWith('/embed/'))
        return u.pathname.split('/embed/')[1]?.split('/')[0] ?? null
      if (u.pathname.startsWith('/shorts/'))
        return u.pathname.split('/shorts/')[1]?.split('/')[0] ?? null
    }
    return null
  } catch {
    return null
  }
}

export function MediaCard({ item, viewerRole }: MediaCardProps) {
  const videoId =
    item.fileType === 'video' || item.fileType === 'audio'
      ? getYoutubeVideoId(item.fileUrl)
      : null
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : null

  return (
    <Link
      to="/library/$mediaId"
      params={{ mediaId: item.id }}
      className="group flex w-44 flex-shrink-0 flex-col gap-2"
    >
      <div className="relative aspect-video overflow-hidden border border-white/10 bg-black/20">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.title}
            className="size-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[#8E816D]">
            <FileTextIcon className="size-5" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/50" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-[#F8F4EC]">
          {item.title}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="border border-white/12 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-[0.1em] text-[#8E816D] uppercase">
            {item.fileType === 'document' ? 'PDF' : 'Video'}
          </span>
          <span className="border border-white/12 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-[0.1em] text-[#8E816D] uppercase">
            {item.category}
          </span>
          {viewerRole !== 'student' && !item.isPublished && (
            <span className="border border-white/12 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-[0.1em] text-[#8E816D] uppercase">
              Draft
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Check types compile**

```bash
bun run tsc --noEmit
```

Expected: No errors for the new file.

- [ ] **Step 3: Commit**

```bash
gt c -m "feat: add MediaCard component for library shelf items"
```

---

## Task 4: Create `src/components/library/LibraryShelf.tsx`

**Files:**
- Create: `src/components/library/LibraryShelf.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { MediaLibraryRow } from '@/utils/library/library'
import { MediaCard } from '@/components/library/MediaCard'

type LibraryShelfProps = {
  topic: string
  ebooks: MediaLibraryRow[]
  audioVisual: MediaLibraryRow[]
  viewerRole: 'student' | 'teacher' | 'admin'
}

export function LibraryShelf({
  topic,
  ebooks,
  audioVisual,
  viewerRole,
}: LibraryShelfProps) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <div className="h-px w-8 bg-[#9B7A41]/50" />
        <h2 className="mt-2 font-serif text-xl tracking-[-0.01em] text-[#1C1815]">
          {topic}
        </h2>
      </div>

      {ebooks.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.68rem] font-medium tracking-[0.25em] text-[#9B7A41] uppercase">
            eBooks
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {ebooks.map((item) => (
              <MediaCard key={item.id} item={item} viewerRole={viewerRole} />
            ))}
          </div>
        </div>
      )}

      {audioVisual.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.68rem] font-medium tracking-[0.25em] text-[#9B7A41] uppercase">
            Audio-Visual
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {audioVisual.map((item) => (
              <MediaCard key={item.id} item={item} viewerRole={viewerRole} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Check types compile**

```bash
bun run tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
gt c -m "feat: add LibraryShelf component with eBooks and Audio-Visual rows"
```

---

## Task 5: Update `src/components/dialog/MediaDialog.tsx`

**Files:**
- Modify: `src/components/dialog/MediaDialog.tsx:1-5` (imports)
- Modify: `src/components/dialog/MediaDialog.tsx:204-216` (category field)
- Modify: `src/components/dialog/MediaDialog.tsx:45-52` (emptyFormData type)

The category field changes from a free-text `<TextField>` to a `<FormFieldSelect>` populated from `LIBRARY_TOPICS`.

- [ ] **Step 1: Add the LIBRARY_TOPICS import**

At the top of `src/components/dialog/MediaDialog.tsx`, add one import line after the existing imports:

```ts
import { LIBRARY_TOPICS } from '@/lib/library-topics'
```

- [ ] **Step 2: Update `MediaFormData` type and `emptyFormData`**

The `category` type remains `string` in the form (the Select value is always a string). No type change needed — the Zod enum validator enforces the constraint on submit.

- [ ] **Step 3: Replace the category `AppField` block**

Find this block in `MediaDialog.tsx` (around line 204):

```tsx
<form.AppField
  name="category"
  validators={{ onSubmit: createMediaSchema.shape.category }}
>
  {(field) => (
    <field.TextField
      id="media-category"
      label="Category"
      required
      placeholder="Foundations"
    />
  )}
</form.AppField>
```

Replace it with:

```tsx
<form.AppField
  name="category"
  validators={{ onSubmit: createMediaSchema.shape.category }}
>
  {(field) => (
    <FormFieldSelect
      id="media-category"
      label="Category"
      required
      value={field.state.value}
      onChange={(value) => field.handleChange(value)}
      placeholder="Select topic..."
      error={
        field.state.meta.errors.length > 0
          ? String(field.state.meta.errors[0])
          : undefined
      }
    >
      {LIBRARY_TOPICS.map((topic) => (
        <SelectItem key={topic} value={topic}>
          {topic}
        </SelectItem>
      ))}
    </FormFieldSelect>
  )}
</form.AppField>
```

- [ ] **Step 4: Check types compile and verify no unused imports**

```bash
bun run tsc --noEmit
```

Expected: No errors. `field.TextField` is removed; confirm `FormFieldSelect` and `SelectItem` were already imported (they are — lines 22–23 of the original file).

- [ ] **Step 5: Commit**

```bash
gt c -m "feat: replace category text input with topic dropdown in MediaDialog"
```

---

## Task 6: Update `src/routes/_authed/library/index.tsx`

**Files:**
- Modify: `src/routes/_authed/library/index.tsx`

This is the main rendering change: add the shelf view for all users, keep the DataTable below for teachers/admins only.

- [ ] **Step 1: Add new imports at the top**

Add after the existing imports in `src/routes/_authed/library/index.tsx`:

```ts
import { LIBRARY_TOPICS, buildShelves } from '@/lib/library-topics'
import { LibraryShelf } from '@/components/library/LibraryShelf'
```

- [ ] **Step 2: Replace the `LibraryComponent` return**

Replace the entire `return (...)` block of `LibraryComponent` (from `<PageLayout>` to the closing `</PageLayout>`) with:

```tsx
return (
  <PageLayout>
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <div className="h-px w-8 bg-[#9B7A41]/50" />
        <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
          Resources
        </div>
        <h1 className="mt-1 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
          Library
        </h1>
        <p className="mt-2 text-sm text-[#5E5549]">
          Browse videos and documents shared by teachers
        </p>
      </div>

      {canCreate && (
        <Button theme="light" onClick={() => openDialog('create')}>
          <PlusIcon className="size-4" />
          Add Media
        </Button>
      )}
    </div>

    {media.length === 0 ? (
      <EmptyState
        icon={FileTextIcon}
        heading="No media yet"
        description={
          canCreate
            ? 'Add the first library item to get started'
            : 'Check back later for new materials'
        }
        actionLabel="Add Media"
        onAction={() => openDialog('create')}
        showAction={canCreate}
        variant="light"
      />
    ) : (
      <>
        {(() => {
          const shelves = buildShelves(media)
          const topics = LIBRARY_TOPICS.filter((topic) => {
            const s = shelves.get(topic)
            return (s?.ebooks.length ?? 0) > 0 || (s?.audioVisual.length ?? 0) > 0
          })

          if (topics.length === 0) {
            return (
              <p className="text-sm text-[#8E816D]">
                No content has been organized into shelves yet.
              </p>
            )
          }

          return (
            <div className="flex flex-col gap-12">
              {topics.map((topic) => {
                const shelf = shelves.get(topic)!
                return (
                  <LibraryShelf
                    key={topic}
                    topic={topic}
                    ebooks={shelf.ebooks}
                    audioVisual={shelf.audioVisual}
                    viewerRole={viewer.role}
                  />
                )
              })}
            </div>
          )
        })()}

        {canCreate && (
          <div className="mt-16">
            <div className="mb-6">
              <div className="h-px w-8 bg-[#9B7A41]/50" />
              <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                Manage
              </div>
              <h2 className="mt-1 font-serif text-xl tracking-[-0.02em] text-[#1C1815]">
                All Media
              </h2>
            </div>
            <DataTable
              columns={columns}
              data={media}
              pageSize={15}
              searchPlaceholder="Search library…"
            />
          </div>
        )}
      </>
    )}

    <MediaDialog
      key={`${dialogMode}-${dialogMedia?.id}`}
      open={isOpen}
      onOpenChange={(open) => !open && closeDialog()}
      mode={dialogMode as 'create' | 'edit' | 'delete'}
      media={dialogMedia}
    />
  </PageLayout>
)
```

- [ ] **Step 3: Remove unused `cn` import if no longer used**

Check whether `cn` is still used in the file after the edit. The original used `cn(viewer.role === 'student' && 'mt-2')`. If that wrapper div is gone, remove `cn` from the imports to keep things clean.

```bash
grep -n "cn(" src/routes/_authed/library/index.tsx
```

If no matches, remove `cn` from the import line at the top.

- [ ] **Step 4: Check types compile**

```bash
bun run tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Verify tests still pass**

```bash
bun test src/lib/library-topics.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
gt c -m "feat: replace library flat table with topic shelves; keep management table for teachers/admins"
```

---

## Verification Checklist

Manual steps to confirm the feature works end-to-end:

- [ ] Start dev server: `bun run dev`
- [ ] As admin/teacher: open `/library` → "All Media" DataTable is visible at the bottom
- [ ] As admin/teacher: click "Add Media" → category field is a dropdown with 10 topics
- [ ] Create a media item with category "Wisdom" and type "YouTube" → save → it appears in the Wisdom > Audio-Visual shelf row
- [ ] Create a media item with category "Wisdom" and type "PDF" → save → it appears in the Wisdom > eBooks shelf row
- [ ] As student: open `/library` → DataTable is NOT visible; only shelves
- [ ] Click a shelf card → navigates to `/library/$mediaId` detail page correctly
- [ ] An existing item with category "General" → does not appear in any shelf; admin sees it in DataTable only
- [ ] Topics with no items are not rendered (no empty shelf headings)
- [ ] If only eBooks exist for a topic, the Audio-Visual sub-label is not shown (and vice versa)
