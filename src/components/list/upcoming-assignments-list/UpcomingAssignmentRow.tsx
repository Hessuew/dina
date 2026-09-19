import { Link, useRouter } from '@tanstack/react-router'
import { CalendarIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Assignment } from '@/components/view/assignments-view/AssignmentsView'
import { buildUpcomingAssignmentRow } from '@/components/list/upcoming-assignments-list/upcoming-assignments-list.domain'
import { cn } from '@/lib/utils'

type UpcomingAssignmentsRole = Parameters<typeof buildUpcomingAssignmentRow>[1]
type UpcomingAssignmentViewModel = ReturnType<typeof buildUpcomingAssignmentRow>

type UpcomingAssignmentRowProps = {
  assignment: Assignment
  idx: number
  role: UpcomingAssignmentsRole
  now: Date
}

function AssignmentStatusBadge({
  badgeClassName,
  statusIcon: StatusIcon,
  submissionStatus,
}: {
  badgeClassName: string
  statusIcon: LucideIcon
  submissionStatus: string
}) {
  return (
    <div
      className={cn(
        'shrink-0 border px-2 py-1 text-[0.58rem] font-medium tracking-[0.18em] uppercase',
        badgeClassName,
      )}
    >
      <span className="flex items-center gap-1">
        <StatusIcon className="size-2.5" />
        {submissionStatus}
      </span>
    </div>
  )
}

function AssignmentRowMeta({
  dueDateClassName,
  formattedDueDate,
  overdue,
  teacherStatsText,
}: {
  dueDateClassName: string
  formattedDueDate: string
  overdue: boolean
  teacherStatsText: string | null
}) {
  return (
    <div className="mt-1.5 flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs">
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-1',
          dueDateClassName,
        )}
      >
        <CalendarIcon className="size-3" />
        <span>Due {formattedDueDate}</span>
        {overdue && <span className="ml-1 text-[#C5A059]">(Overdue)</span>}
      </div>
      {teacherStatsText && (
        <div className="min-w-0 text-[#8E816D]">{teacherStatsText}</div>
      )}
    </div>
  )
}

function preloadAssignmentRoute(
  router: ReturnType<typeof useRouter>,
  assignmentId: string,
) {
  void router
    .preloadRoute({
      to: '/assignments/$assignmentId',
      params: { assignmentId },
      search: {
        fromDashboard: false,
        fromCalendar: false,
        calendarMonth: undefined,
      },
    })
    .catch(() => undefined)
}

function UpcomingAssignmentLink({
  assignment,
  idx,
  viewModel,
  onPointerDown,
}: {
  assignment: Assignment
  idx: number
  viewModel: UpcomingAssignmentViewModel
  onPointerDown: () => void
}) {
  return (
    <Link
      to="/assignments/$assignmentId"
      params={{ assignmentId: assignment.id }}
      search={{
        fromDashboard: false,
        fromCalendar: false,
        calendarMonth: undefined,
      }}
      onPointerDown={onPointerDown}
      className="block"
    >
      <div className="group flex items-start gap-4 border-b border-white/8 py-5 pl-1 transition-all first:pt-1 last:border-b-0 last:pb-0 hover:bg-white/8">
        <div className="flex size-8 shrink-0 items-center justify-center border border-[#C5A059]/50 bg-[#1A1716] font-serif text-xs text-[#E9D9B4]">
          {idx + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[0.62rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
                {assignment.lesson.course.title}
              </div>
              <div className="mt-1 truncate font-serif text-base text-[#F8F4EC] group-hover:text-white">
                {assignment.title}
              </div>
            </div>
            {viewModel.showStudentBadge && (
              <AssignmentStatusBadge
                badgeClassName={viewModel.badgeClassName}
                statusIcon={viewModel.statusIcon}
                submissionStatus={viewModel.submissionStatus}
              />
            )}
          </div>
          <AssignmentRowMeta
            dueDateClassName={viewModel.dueDateClassName}
            formattedDueDate={viewModel.formattedDueDate}
            overdue={viewModel.overdue}
            teacherStatsText={viewModel.teacherStatsText}
          />
        </div>
      </div>
    </Link>
  )
}

export function UpcomingAssignmentRow({
  assignment,
  idx,
  role,
  now,
}: UpcomingAssignmentRowProps) {
  const router = useRouter()
  const viewModel = buildUpcomingAssignmentRow(assignment, role, now)

  return (
    <UpcomingAssignmentLink
      assignment={assignment}
      idx={idx}
      viewModel={viewModel}
      onPointerDown={() => preloadAssignmentRoute(router, assignment.id)}
    />
  )
}
