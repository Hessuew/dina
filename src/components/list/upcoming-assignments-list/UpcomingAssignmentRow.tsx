import { Link } from '@tanstack/react-router'
import { CalendarIcon } from 'lucide-react'
import type { Assignment } from '@/components/view/assignments-view/AssignmentsView'
import type { UpcomingAssignmentsRole } from '@/components/list/upcoming-assignments-list/upcoming-assignments-list.domain'
import { buildUpcomingAssignmentRow } from '@/components/list/upcoming-assignments-list/upcoming-assignments-list.domain'
import { cn } from '@/lib/utils'

type UpcomingAssignmentRowProps = {
  assignment: Assignment
  idx: number
  role: UpcomingAssignmentsRole
  now: Date
}

export function UpcomingAssignmentRow({
  assignment,
  idx,
  role,
  now,
}: UpcomingAssignmentRowProps) {
  const {
    submissionStatus,
    formattedDueDate,
    showStudentBadge,
    badgeClassName,
    statusIcon: StatusIcon,
    dueDateClassName,
    teacherStatsText,
    overdue,
  } = buildUpcomingAssignmentRow(assignment, role, now)

  return (
    <Link
      to="/assignments/$assignmentId"
      params={{ assignmentId: assignment.id }}
      search={{
        fromDashboard: false,
        fromCalendar: false,
        calendarMonth: undefined,
      }}
      className="block"
    >
      <div className="group flex items-start gap-4 border-b border-white/8 py-5 pl-1 transition-all first:pt-1 last:border-b-0 last:pb-0 hover:bg-white/8">
        <div className="flex size-8 shrink-0 items-center justify-center border border-[#C5A059]/50 bg-[#1A1716] font-serif text-xs text-[#E9D9B4]">
          {idx + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[0.62rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
                {assignment.lesson.course.title}
              </div>
              <div className="mt-1 truncate font-serif text-base text-[#F8F4EC] group-hover:text-white">
                {assignment.title}
              </div>
            </div>
            {showStudentBadge && (
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
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <div className={cn('flex items-center gap-1', dueDateClassName)}>
              <CalendarIcon className="size-3" />
              <span>Due {formattedDueDate}</span>
              {overdue && (
                <span className="ml-1 text-[#C5A059]">(Overdue)</span>
              )}
            </div>
            {teacherStatsText && (
              <div className="text-[#8E816D]">{teacherStatsText}</div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
