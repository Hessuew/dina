import { Suspense, lazy, useMemo } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  EyeIcon,
  HeartHandshakeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import type { CalendarEventRow } from '@/utils/event'
import { useDialogState } from '@/hooks/useDialogState'
import { Button } from '@/components/ui/button'
import { DataTable, createButtonColumn } from '@/components/table/DataTable'
import { PageLayout } from '@/components/layout/page-layout'
import { EmptyState } from '@/components/ui/empty-state/EmptyState'
import { cn } from '@/lib/utils'
import { requireTeacherOrAdminRole } from '@/utils/auth/domain/user-context.domain'
import { getEvents } from '@/utils/event'
import { createCrudActions } from '@/components/table/functions/createCrudActions'
import { ViewerDateTime } from '@/components/ui/viewer-date-time'

const EventDialog = lazy(() =>
  import('@/components/dialog/event-dialog/EventDialog').then((module) => ({
    default: module.EventDialog,
  })),
)

export const Route = createFileRoute('/_authed/events')({
  beforeLoad: ({ context }) => {
    const role = requireTeacherOrAdminRole(context.user?.role, () => {
      throw redirect({ to: '/dashboard', search: { verified: false } })
    })
    return { role }
  },
  loader: async () => {
    const result = await getEvents()
    return { events: result.events }
  },
  component: EventsComponent,
})

const CATEGORY_LABEL: Record<string, string> = {
  chapel: 'Chapel',
  exam: 'Exam',
  lesson: 'Lesson',
  personal: 'Personal',
  other: 'Other',
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  chapel: HeartHandshakeIcon,
  exam: AlertTriangleIcon,
  lesson: BookOpenIcon,
  personal: UserIcon,
  other: CalendarDaysIcon,
}

const CATEGORY_CHIP: Record<string, string> = {
  chapel: 'border-violet-500/30 bg-violet-950/40 text-violet-300',
  exam: 'border-red-500/30 bg-red-950/40 text-red-300',
  lesson: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300',
  personal: 'border-sky-500/30 bg-sky-950/40 text-sky-300',
  other: 'border-gray-500/30 bg-gray-950/40 text-gray-300',
}

const columnHelper = createColumnHelper<CalendarEventRow>()

type OpenEventDialog = ReturnType<
  typeof useDialogState<CalendarEventRow>
>['openDialog']

function EventCategoryCell({ category }: { category: string | null }) {
  if (!category) return <span className="text-xs text-[#8E816D]">—</span>
  const CategoryIcon = CATEGORY_ICON[category]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.12em] uppercase',
        CATEGORY_CHIP[category],
      )}
    >
      <CategoryIcon className="size-2.5" />
      {CATEGORY_LABEL[category]}
    </span>
  )
}

function useEventColumns(
  openDialog: OpenEventDialog,
): Array<ColumnDef<CalendarEventRow, any>> {
  return useMemo(
    () => [
      columnHelper.accessor('title', {
        cell: (info) => (
          <span className="font-medium text-[#F8F4EC]">{info.getValue()}</span>
        ),
        header: 'Title',
      }),
      columnHelper.accessor('category', {
        cell: (info) => <EventCategoryCell category={info.getValue()} />,
        header: 'Category',
      }),
      columnHelper.accessor('startTime', {
        cell: (info) => (
          <ViewerDateTime value={info.getValue()} pattern="PPp" />
        ),
        header: 'Start',
      }),
      columnHelper.accessor('endTime', {
        cell: (info) => {
          const endTime = info.getValue()
          return endTime ? (
            <ViewerDateTime value={endTime} pattern="PPp" />
          ) : (
            '—'
          )
        },
        header: 'End',
      }),
      columnHelper.accessor('location', {
        cell: (info) => {
          const location = info.getValue()
          return location ? location : '—'
        },
        header: 'Location',
      }),
      createButtonColumn(
        createCrudActions<CalendarEventRow>({
          onView: (event) => openDialog('view', event),
          onEdit: (event) => openDialog('edit', event),
          onDelete: (event) => openDialog('delete', event),
        }),
      ),
    ],
    [openDialog],
  )
}

function EventsPageHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="h-px w-8 bg-[#9B7A41]/50" />
        <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
          School Calendar
        </div>
        <h1 className="mt-1 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
          Events
        </h1>
        <p className="mt-2 text-sm text-[#5E5549]">
          Manage lessons, chapel services, exams, and school-wide occasions
        </p>
      </div>
      <Button className="w-full sm:w-auto" theme="light" onClick={onCreate}>
        <PlusIcon className="size-4" />
        Create Event
      </Button>
    </div>
  )
}

type EventMobileCardProps = {
  event: CalendarEventRow
  onView: (event: CalendarEventRow) => void
  onEdit: (event: CalendarEventRow) => void
  onDelete: (event: CalendarEventRow) => void
}

function EventMobileDetails({ event }: { event: CalendarEventRow }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg break-words text-[#F8F4EC]">
            {event.title}
          </h3>
          <p className="mt-1 text-xs text-[#AFA28F]">
            {event.courseName ?? 'School-wide event'}
          </p>
        </div>
        <EventCategoryCell category={event.category} />
      </div>

      <div className="mt-4 grid gap-3 border-y border-white/10 py-3 sm:grid-cols-2">
        <EventMobileDetail label="Starts">
          <ViewerDateTime value={event.startTime} pattern="PPp" />
        </EventMobileDetail>
        <EventMobileDetail label="Ends">
          {event.endTime ? (
            <ViewerDateTime value={event.endTime} pattern="PPp" />
          ) : (
            '—'
          )}
        </EventMobileDetail>
        <EventMobileDetail label="Location" className="sm:col-span-2">
          {event.location || '—'}
        </EventMobileDetail>
      </div>
    </>
  )
}

function EventMobileDetail({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <p className="text-[0.62rem] font-medium tracking-[0.16em] text-[#8E816D] uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm break-words text-[#D6CCBE]">{children}</p>
    </div>
  )
}

function EventMobileActions({
  event,
  onView,
  onEdit,
  onDelete,
}: Pick<EventMobileCardProps, 'event' | 'onView' | 'onEdit' | 'onDelete'>) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        theme="dark"
        onClick={() => onView(event)}
      >
        <EyeIcon className="size-3.5" />
        View
      </Button>
      <Button
        type="button"
        size="sm"
        theme="dark"
        onClick={() => onEdit(event)}
      >
        <PencilIcon className="size-3.5" />
        Edit
      </Button>
      <Button
        type="button"
        size="sm"
        theme="dark"
        variant="outline"
        onClick={() => onDelete(event)}
      >
        <Trash2Icon className="size-3.5" />
        Delete
      </Button>
    </div>
  )
}

function EventMobileCard({
  event,
  onView,
  onEdit,
  onDelete,
}: EventMobileCardProps) {
  return (
    <article className="border border-white/10 bg-[#151515]/88 p-4 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      <EventMobileDetails event={event} />

      <EventMobileActions
        event={event}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </article>
  )
}

function EventsTableSection({
  events,
  columns,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: {
  events: Array<CalendarEventRow>
  columns: Array<ColumnDef<CalendarEventRow, any>>
  onCreate: () => void
  onView: (event: CalendarEventRow) => void
  onEdit: (event: CalendarEventRow) => void
  onDelete: (event: CalendarEventRow) => void
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDaysIcon}
        heading="No events yet"
        description="Create the first school event to get started"
        actionLabel="Create Event"
        onAction={onCreate}
        variant="light"
      />
    )
  }

  return (
    <DataTable
      columns={columns}
      data={events}
      pageSize={15}
      searchPlaceholder="Search events…"
      renderMobileRow={(event) => (
        <EventMobileCard
          event={event}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    />
  )
}

function EventsComponent() {
  const { events } = Route.useLoaderData()
  const {
    isOpen,
    dialogMode,
    dialogItem: dialogEvent,
    openDialog,
    closeDialog,
  } = useDialogState<CalendarEventRow>()

  const columns = useEventColumns(openDialog)

  return (
    <PageLayout>
      <EventsPageHeader onCreate={() => openDialog('create')} />

      <EventsTableSection
        events={events}
        columns={columns}
        onCreate={() => openDialog('create')}
        onView={(event) => openDialog('view', event)}
        onEdit={(event) => openDialog('edit', event)}
        onDelete={(event) => openDialog('delete', event)}
      />

      {isOpen && (
        <Suspense fallback={null}>
          <EventDialog
            key={`${dialogMode}-${dialogEvent?.id}`}
            open={true}
            onOpenChange={(open) => !open && closeDialog()}
            mode={dialogMode}
            event={dialogEvent}
          />
        </Suspense>
      )}
    </PageLayout>
  )
}
