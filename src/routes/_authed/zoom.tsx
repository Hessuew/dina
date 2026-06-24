import { createFileRoute } from '@tanstack/react-router'
import {
  ExternalLinkIcon,
  KeyRoundIcon,
  LinkIcon,
  PencilIcon,
  PlusIcon,
  VideoIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ZoomLinkDialogState } from '@/components/dialog/zoom-link-dialog/ZoomLinkDialog'
import type { ZoomLinkRow, ZoomLinkSection } from '@/utils/zoomLink'
import { ZoomLinkDialog } from '@/components/dialog/zoom-link-dialog/ZoomLinkDialog'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { getZoomLinks } from '@/utils/zoomLink'

const sectionCopy: Record<
  ZoomLinkSection,
  { title: string; eyebrow: string; empty: string }
> = {
  general_class_lecture: {
    title: 'General Class Lectures',
    eyebrow: 'Main class lectures',
    empty: 'No general class lecture links have been added yet.',
  },
  discipleship_group: {
    title: 'Discipleship Groups',
    eyebrow: 'Lecturer pair sessions',
    empty: 'No discipleship group links have been added yet.',
  },
}

export const Route = createFileRoute('/_authed/zoom')({
  loader: async () => getZoomLinks(),
  component: ZoomComponent,
})

function ZoomComponent() {
  const { links, courses, role } = Route.useLoaderData()
  const [dialogState, setDialogState] = useState<ZoomLinkDialogState>(null)
  const canEdit = role === 'admin'

  const groupedLinks = useMemo(
    () => ({
      general_class_lecture: links.filter(
        (link) => link.section === 'general_class_lecture',
      ),
      discipleship_group: links.filter(
        (link) => link.section === 'discipleship_group',
      ),
    }),
    [links],
  )

  return (
    <div
      className="relative isolate min-h-screen overflow-hidden bg-[#121212]"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.92), rgba(16,16,17,0.96)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(197,160,89,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_22%)]" />
      <main className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
        <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="h-px w-10 bg-[#C5A059]/50" />
            <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em] text-[#F8F4EC] sm:text-5xl">
              Zoom
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 tracking-[0.04em] text-[#CFC6B7]">
              Live class and discipleship meeting details for the academy.
            </p>
          </div>
          {canEdit && (
            <Button
              theme="dark"
              size="lg"
              onClick={() => setDialogState({ mode: 'create' })}
            >
              <PlusIcon className="size-4" />
              Add Link
            </Button>
          )}
        </div>

        <div className="grid gap-8">
          <ZoomSection
            canEdit={canEdit}
            links={groupedLinks.general_class_lecture}
            section="general_class_lecture"
            onEdit={(link) => setDialogState({ mode: 'edit', link })}
          />
          <ZoomSection
            canEdit={canEdit}
            links={groupedLinks.discipleship_group}
            section="discipleship_group"
            onEdit={(link) => setDialogState({ mode: 'edit', link })}
          />
        </div>
      </main>

      <ZoomLinkDialog
        courses={courses}
        dialogState={dialogState}
        onOpenChange={(open) => !open && setDialogState(null)}
      />
    </div>
  )
}

function ZoomSection({
  canEdit,
  links,
  section,
  onEdit,
}: {
  canEdit: boolean
  links: Array<ZoomLinkRow>
  section: ZoomLinkSection
  onEdit: (link: ZoomLinkRow) => void
}) {
  const copy = sectionCopy[section]

  return (
    <section className="border border-white/10 bg-[#171717]/72 p-5 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:p-6">
      <div className="mb-6 flex flex-col justify-between gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
            {copy.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-[-0.03em] text-[#F8F4EC]">
            {copy.title}
          </h2>
        </div>
        <p className="text-xs tracking-[0.2em] text-[#8E816D] uppercase">
          {links.length} {links.length === 1 ? 'session' : 'sessions'}
        </p>
      </div>

      {links.length === 0 ? (
        <div className="border border-white/8 bg-white/4 px-5 py-8 text-sm text-[#AFA28F]">
          {copy.empty}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {links.map((link) => (
            <ZoomCard
              key={link.id}
              canEdit={canEdit}
              link={link}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ZoomCard({
  canEdit,
  link,
  onEdit,
}: {
  canEdit: boolean
  link: ZoomLinkRow
  onEdit: (link: ZoomLinkRow) => void
}) {
  return (
    <article className="group border border-white/10 bg-[#151515]/88 p-5 transition-all hover:-translate-y-0.5 hover:border-[#C5A059]/35">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.64rem] font-medium tracking-[0.28em] text-[#8E816D] uppercase">
            {link.courseTitle ?? sectionCopy[link.section].eyebrow}
          </p>
          <h3 className="mt-2 font-serif text-xl leading-tight text-[#F8F4EC]">
            {link.title}
          </h3>
        </div>
        {canEdit && (
          <Button
            aria-label={`Edit ${link.title}`}
            theme="dark"
            size="icon"
            onClick={() => onEdit(link)}
          >
            <PencilIcon className="size-4" />
          </Button>
        )}
      </div>

      {link.description && (
        <p className="mt-4 text-sm leading-6 text-[#C9C0B6]">
          {link.description}
        </p>
      )}

      <div className="mt-5 grid gap-3 border-t border-white/8 pt-5">
        <DetailRow icon={LinkIcon} label="Zoom link">
          <a
            href={link.zoomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-0 items-center gap-2 text-[#E9D9B4] hover:text-white"
          >
            <span className="truncate">Join session</span>
            <ExternalLinkIcon className="size-3.5 shrink-0" />
          </a>
        </DetailRow>
        <DetailRow icon={VideoIcon} label="Meeting ID">
          {link.meetingId}
        </DetailRow>
        <DetailRow icon={KeyRoundIcon} label="Passcode">
          {link.passcode}
        </DetailRow>
      </div>
    </article>
  )
}

function DetailRow({
  children,
  icon: Icon,
  label,
}: {
  children: React.ReactNode
  icon: React.ElementType
  label: string
}) {
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
      <div className="flex items-center gap-2 text-[0.64rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="min-w-0 text-[#F7F4EE]">{children}</div>
    </div>
  )
}
