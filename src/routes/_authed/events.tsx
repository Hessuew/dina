import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  EyeIcon,
  HeartHandshakeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react'
import { useDialogState } from '@/hooks/useDialogState'
import { format } from 'date-fns'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { CalendarEventRow } from '@/utils/event'
import { EventDialog } from '@/components/dialog/EventDialog'
import { Button } from '@/components/ui/button'
import { DataTable, createButtonColumn } from '@/components/table/DataTable'
import { PageLayout } from '@/components/layout/page-layout'
import { cn } from '@/lib/utils'
import { getCourses } from '@/utils/courses'
import { getEvents } from '@/utils/event'

export const Route = createFileRoute('/_authed/events')({
  beforeLoad: async () => {
    const coursesData = await getCourses()
    const isTeacherOrAdmin =
      coursesData.role === 'teacher' || coursesData.role === 'admin'

    if (!isTeacherOrAdmin) {
      throw redirect({ to: '/dashboard', search: { verified: false } })
    }

    return { role: coursesData.role }
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
  personal: 'Personal',
  other: 'Other',
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  chapel: HeartHandshakeIcon,
  exam: AlertTriangleIcon,
  personal: UserIcon,
  other: CalendarDaysIcon,
}

const CATEGORY_CHIP: Record<string, string> = {
  chapel: 'border-violet-500/30 bg-violet-950/40 text-violet-300',
  exam: 'border-red-500/30 bg-red-950/40 text-red-300',
  personal: 'border-sky-500/30 bg-sky-950/40 text-sky-300',
  other: 'border-gray-500/30 bg-gray-950/40 text-gray-300',
}

const columnHelper = createColumnHelper<CalendarEventRow>()

function EventsComponent() {
  const { events } = Route.useLoaderData()
  const { isOpen, dialogMode, dialogItem: dialogEvent, openDialog, closeDialog } =
    useDialogState<CalendarEventRow>()

  const columns: Array<ColumnDef<CalendarEventRow, any>> = [
    columnHelper.accessor('title', {
      cell: (info) => (
        <span className="font-medium text-[#F8F4EC]">{info.getValue()}</span>
      ),
      header: 'Title',
    }),
    columnHelper.accessor('category', {
      cell: (info) => {
        const category = info.getValue()
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
      },
      header: 'Category',
    }),
    columnHelper.accessor('startTime', {
      cell: (info) => format(new Date(info.getValue()), 'PPp'),
      header: 'Start',
    }),
    columnHelper.accessor('endTime', {
      cell: (info) => format(new Date(info.getValue()), 'PPp'),
      header: 'End',
    }),
    columnHelper.accessor('location', {
      cell: (info) => {
        const location = info.getValue()
        return location ? location : '—'
      },
      header: 'Location',
    }),
    createButtonColumn([
      {
        icon: EyeIcon,
        label: 'View',
        onClick: (event) => openDialog('view', event),
      },
      {
        icon: PencilIcon,
        label: 'Edit',
        onClick: (event) => openDialog('edit', event),
      },
      {
        icon: Trash2Icon,
        label: 'Delete',
        onClick: (event) => openDialog('delete', event),
      },
    ]),
  ]

  return (
    <PageLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="h-px w-8 bg-[#9B7A41]/50" />
          <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
            School Calendar
          </div>
          <h1 className="mt-1 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
            Events
          </h1>
          <p className="mt-2 text-sm text-[#5E5549]">
            Manage chapel services, exams, and school-wide occasions
          </p>
        </div>
        <Button
          theme="light"
          onClick={() => openDialog('create')}
        >
          <PlusIcon className="size-4" />
          Create Event
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-[#1A1A1A]/20 bg-[#EDE8DE]/40 p-16 text-center">
          <CalendarDaysIcon className="mb-3 size-8 text-[#9B7A41]/50" />
          <h3 className="font-serif text-lg text-[#1C1815]">No events yet</h3>
          <p className="mt-2 text-sm text-[#5E5549]">
            Create the first school event to get started
          </p>
          <Button
            theme="light"
            className="mt-4"
            onClick={() => openDialog('create')}
          >
            <PlusIcon className="size-4" />
            Create Event
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={events}
          pageSize={15}
          searchPlaceholder="Search events…"
        />
      )}

      <EventDialog
        key={`${dialogMode}-${dialogEvent?.id}`}
        open={isOpen}
        onOpenChange={(open) => !open && closeDialog()}
        mode={dialogMode}
        event={dialogEvent}
      />
    </PageLayout>
  )
}
