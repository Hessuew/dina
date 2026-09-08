import type { MediaLibraryRow } from '@/utils/library/library'
import { MediaCard } from '@/components/library/media-card/MediaCard'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'

type LibraryShelfPermissions = {
  canEdit: boolean
  isCourseTeacher: boolean
}

type LibraryShelfProps = {
  topic: string
  lectures: Array<MediaLibraryRow>
  ebooks: Array<MediaLibraryRow>
  audioVisual: Array<MediaLibraryRow>
  viewerRole: 'student' | 'teacher' | 'admin'
  permissions?: LibraryShelfPermissions
  onEditMedia?: (item: MediaLibraryRow) => void
  onDeleteMedia?: (item: MediaLibraryRow) => void
}

function MediaCardWithActions({
  item,
  viewerRole,
  permissions,
  onEditMedia,
  onDeleteMedia,
}: {
  item: MediaLibraryRow
  viewerRole: 'student' | 'teacher' | 'admin'
  permissions?: LibraryShelfPermissions
  onEditMedia?: (item: MediaLibraryRow) => void
  onDeleteMedia?: (item: MediaLibraryRow) => void
}) {
  const canManage =
    permissions != null &&
    onEditMedia != null &&
    onDeleteMedia != null &&
    permissions.canEdit &&
    permissions.isCourseTeacher

  return (
    <div className="group relative w-full shrink-0 sm:w-auto">
      <MediaCard item={item} viewerRole={viewerRole} />
      {canManage && (
        <div
          className="absolute top-1 left-1 hidden group-hover:flex"
          onClick={(e) => e.preventDefault()}
        >
          <EntityHeaderActions
            status="published"
            canEdit={permissions.canEdit}
            isCourseTeacher={permissions.isCourseTeacher}
            showStatus={false}
            theme="dark"
            size="sm"
            onEdit={() => onEditMedia(item)}
            onDelete={() => onDeleteMedia(item)}
          />
        </div>
      )}
    </div>
  )
}

function ShelfSection({
  label,
  items,
  viewerRole,
  permissions,
  onEditMedia,
  onDeleteMedia,
}: {
  label: string
  items: Array<MediaLibraryRow>
  viewerRole: LibraryShelfProps['viewerRole']
  permissions?: LibraryShelfPermissions
  onEditMedia?: (item: MediaLibraryRow) => void
  onDeleteMedia?: (item: MediaLibraryRow) => void
}) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.68rem] font-medium tracking-[0.25em] text-[#9B7A41] uppercase">
        {label}
      </p>
      <div className="flex flex-col gap-4 pb-2 sm:flex-row">
        {items.map((item) => (
          <MediaCardWithActions
            key={item.id}
            item={item}
            viewerRole={viewerRole}
            permissions={permissions}
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
        onEditMedia={onEditMedia}
        onDeleteMedia={onDeleteMedia}
      />
      <ShelfSection
        label="eBooks"
        items={ebooks}
        viewerRole={viewerRole}
        permissions={permissions}
        onEditMedia={onEditMedia}
        onDeleteMedia={onDeleteMedia}
      />
      <ShelfSection
        label="Audio-Visual"
        items={audioVisual}
        viewerRole={viewerRole}
        permissions={permissions}
        onEditMedia={onEditMedia}
        onDeleteMedia={onDeleteMedia}
      />
    </section>
  )
}
