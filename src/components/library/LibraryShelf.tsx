import type { MediaLibraryRow } from '@/utils/library/library'
import { MediaCard } from '@/components/library/media-card/MediaCard'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { StarToggle } from '@/components/library/StarToggle'
import { resolveShelfManageActions } from '@/utils/library/domain/library-view.domain'

type LibraryShelfPermissions = {
  canEdit: boolean
  isCourseTeacher: boolean
}

export type ShelfStars = {
  isStarred: (mediaId: string) => boolean
  onToggleStar: (mediaId: string) => void
  /** False until prefs load — hides the chip instead of flashing "unstarred". */
  loaded?: boolean
}

type LibraryShelfProps = {
  topic: string
  lectures: Array<MediaLibraryRow>
  ebooks: Array<MediaLibraryRow>
  audioVisual: Array<MediaLibraryRow>
  viewerRole: 'student' | 'teacher' | 'admin'
  permissions?: LibraryShelfPermissions
  stars?: ShelfStars
  onEditMedia?: (item: MediaLibraryRow) => void
  onDeleteMedia?: (item: MediaLibraryRow) => void
}

function StarOverlay({
  stars,
  mediaId,
}: {
  stars?: ShelfStars
  mediaId: string
}) {
  if (!stars || stars.loaded === false) return null
  return (
    <div
      className="absolute top-1 right-1 z-30"
      onClick={(e) => e.preventDefault()}
    >
      <StarToggle
        starred={stars.isStarred(mediaId)}
        onToggle={() => stars.onToggleStar(mediaId)}
      />
    </div>
  )
}

function ManageActionsOverlay({
  item,
  permissions,
  onEditMedia,
  onDeleteMedia,
}: {
  item: MediaLibraryRow
  permissions?: LibraryShelfPermissions
  onEditMedia?: (item: MediaLibraryRow) => void
  onDeleteMedia?: (item: MediaLibraryRow) => void
}) {
  const actions = resolveShelfManageActions(
    permissions,
    onEditMedia,
    onDeleteMedia,
  )
  if (!actions) return null
  return (
    <div
      className="absolute top-1 left-1 hidden group-hover:flex"
      onClick={(e) => e.preventDefault()}
    >
      <EntityHeaderActions
        status="published"
        canEdit={actions.canEdit}
        isCourseTeacher={actions.isCourseTeacher}
        showStatus={false}
        theme="dark"
        size="sm"
        onEdit={() => actions.onEditMedia(item)}
        onDelete={() => actions.onDeleteMedia(item)}
      />
    </div>
  )
}

function MediaCardWithActions({
  item,
  viewerRole,
  permissions,
  stars,
  onEditMedia,
  onDeleteMedia,
}: {
  item: MediaLibraryRow
  viewerRole: 'student' | 'teacher' | 'admin'
  permissions?: LibraryShelfPermissions
  stars?: ShelfStars
  onEditMedia?: (item: MediaLibraryRow) => void
  onDeleteMedia?: (item: MediaLibraryRow) => void
}) {
  return (
    <div className="group relative w-80 shrink-0 snap-start max-[22rem]:w-[calc(100vw-3rem)] sm:w-auto">
      <MediaCard
        item={item}
        viewerRole={viewerRole}
        reserveTopRight={stars != null}
      />
      <StarOverlay stars={stars} mediaId={item.id} />
      <ManageActionsOverlay
        item={item}
        permissions={permissions}
        onEditMedia={onEditMedia}
        onDeleteMedia={onDeleteMedia}
      />
    </div>
  )
}

export function ShelfSection({
  label,
  items,
  viewerRole,
  permissions,
  stars,
  emptyHint,
  onEditMedia,
  onDeleteMedia,
}: {
  label: string
  items: Array<MediaLibraryRow>
  viewerRole: LibraryShelfProps['viewerRole']
  permissions?: LibraryShelfPermissions
  stars?: ShelfStars
  emptyHint?: string
  onEditMedia?: (item: MediaLibraryRow) => void
  onDeleteMedia?: (item: MediaLibraryRow) => void
}) {
  if (items.length === 0) {
    if (!emptyHint) return null
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[0.68rem] font-medium tracking-[0.25em] text-[#8E816D] uppercase">
          {label}
        </p>
        <p className="text-xs text-[#8E816D]">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.68rem] font-medium tracking-[0.25em] text-[#9B7A41] uppercase">
        {label}
      </p>
      <div className="-mx-6 flex items-start gap-4 overflow-x-auto px-6 pb-2 max-sm:snap-x max-sm:snap-mandatory sm:mx-0 sm:px-0 sm:pb-4">
        {items.map((item) => (
          <MediaCardWithActions
            key={item.id}
            item={item}
            viewerRole={viewerRole}
            permissions={permissions}
            stars={stars}
            onEditMedia={onEditMedia}
            onDeleteMedia={onDeleteMedia}
          />
        ))}
      </div>
    </div>
  )
}

export function LibraryShelf({
  topic,
  lectures,
  ebooks,
  audioVisual,
  viewerRole,
  permissions,
  stars,
  onEditMedia,
  onDeleteMedia,
}: LibraryShelfProps) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <div className="h-px w-8 bg-[#9B7A41]/50" />
        <h2 className="mt-2 font-serif text-xl tracking-[-0.01em] text-[#1C1815]">
          {topic}
        </h2>
      </div>

      <ShelfSection
        label="Lectures"
        items={lectures}
        viewerRole={viewerRole}
        permissions={permissions}
        stars={stars}
        onEditMedia={onEditMedia}
        onDeleteMedia={onDeleteMedia}
      />
      <ShelfSection
        label="eBooks"
        items={ebooks}
        viewerRole={viewerRole}
        permissions={permissions}
        stars={stars}
        onEditMedia={onEditMedia}
        onDeleteMedia={onDeleteMedia}
      />
      <ShelfSection
        label="Audio-Visual"
        items={audioVisual}
        viewerRole={viewerRole}
        permissions={permissions}
        stars={stars}
        onEditMedia={onEditMedia}
        onDeleteMedia={onDeleteMedia}
      />
    </section>
  )
}
