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
import { useState } from 'react'
import { format } from 'date-fns'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { CalendarEventRow } from '@/utils/event'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { EventDialog } from '@/components/dialog/EventDialog'
import { Button } from '@/components/ui/button'
import { DataTable, createButtonColumn } from '@/components/table/DataTable'
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

type DialogState =
  | { mode: 'create' }
  | { mode: 'view'; event: CalendarEventRow }
  | { mode: 'edit'; event: CalendarEventRow }
  | { mode: 'delete'; event: CalendarEventRow }
  | null

const columnHelper = createColumnHelper<CalendarEventRow>()

function EventsComponent() {
  const { events } = Route.useLoaderData()
  const [dialogState, setDialogState] = useState<DialogState>(null)

  const isOpen = dialogState !== null
  const dialogMode = dialogState?.mode ?? 'create'
  const dialogEvent =
    dialogState && dialogState.mode !== 'create' ? dialogState.event : undefined

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
        onClick: (event) => setDialogState({ mode: 'view', event }),
      },
      {
        icon: PencilIcon,
        label: 'Edit',
        onClick: (event) => setDialogState({ mode: 'edit', event }),
      },
      {
        icon: Trash2Icon,
        label: 'Delete',
        onClick: (event) => setDialogState({ mode: 'delete', event }),
      },
    ]),
  ]

  return (
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
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
            onClick={() => setDialogState({ mode: 'create' })}
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
              onClick={() => setDialogState({ mode: 'create' })}
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
      </div>

      <EventDialog
        key={`${dialogMode}-${dialogEvent?.id}`}
        open={isOpen}
        onOpenChange={(open) => !open && setDialogState(null)}
        mode={dialogMode}
        event={dialogEvent}
      />
    </div>
  )
}
