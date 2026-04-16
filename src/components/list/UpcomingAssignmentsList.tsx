import { Link } from '@tanstack/react-router'
import { CalendarIcon, CheckCircle2Icon, CircleIcon } from 'lucide-react'
import type { Assignment } from '@/components/view/AssignmentsView'
import { cn } from '@/lib/utils'

type UpcomingAssignmentsListProps = {
  assignments: Array<Assignment>
  role: 'student' | 'teacher' | 'admin'
}

export function UpcomingAssignmentsList({
  assignments,
  role,
}: UpcomingAssignmentsListProps) {
  const now = new Date()

  const filteredAssignments = assignments
    .filter((assignment) => {
      if (role === 'student') {
        const isNotPastDue = new Date(assignment.dueDate) >= now
        const isNotGraded =
          !assignment.submission || assignment.submission.grade === null
        return assignment.status === 'published' && isNotPastDue && isNotGraded
      } else {
        return assignment.status === 'published'
      }
    })
    .slice(0, 5)

  const formatDate = (date: Date) => {
    const dateObj = new Date(date)
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const isOverdue = (dueDate: Date) => new Date(dueDate) < now

  const getSubmissionStatus = (assignment: Assignment) => {
    if (!assignment.submission) return 'Not Submitted'
    if (
      assignment.submission.status === 'submitted' ||
      assignment.submission.status === 'graded'
    ) {
      return 'Submitted'
    }
    return 'Not Submitted'
  }

  return (
    <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      <div className="px-6 py-4">
        <div className="h-px w-8 bg-[#C5A059]/40" />
        <h3 className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
          {role === 'student' ? 'Open Assignments' : 'Upcoming Assignments'}
        </h3>
      </div>

      <div className="px-5 pb-5">
        {filteredAssignments.length === 0 ? (
          <div className="py-6 text-center text-sm text-[#AFA28F]">
            {role === 'student'
              ? 'No open assignments'
              : 'No upcoming assignments'}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAssignments.map((assignment, idx) => {
              const overdue = isOverdue(assignment.dueDate)
              const submissionStatus = getSubmissionStatus(assignment)
              const isSubmitted = submissionStatus === 'Submitted'

              return (
                <Link
                  key={assignment.id}
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
                        {role === 'student' && (
                          <div
                            className={cn(
                              'shrink-0 border px-2 py-1 text-[0.58rem] font-medium tracking-[0.18em] uppercase',
                              isSubmitted
                                ? 'border-[#C5A059]/40 text-[#D4B373]'
                                : 'border-white/12 text-[#8E816D]',
                            )}
                          >
                            <span className="flex items-center gap-1">
                              {isSubmitted ? (
                                <CheckCircle2Icon className="size-2.5" />
                              ) : (
                                <CircleIcon className="size-2.5" />
                              )}
                              {submissionStatus}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <div
                          className={cn(
                            'flex items-center gap-1',
                            overdue
                              ? 'font-medium text-[#C5A059]'
                              : 'text-[#8E816D]',
                          )}
                        >
                          <CalendarIcon className="size-3" />
                          <span>Due {formatDate(assignment.dueDate)}</span>
                          {overdue && (
                            <span className="ml-1 text-[#C5A059]">
                              (Overdue)
                            </span>
                          )}
                        </div>
                        {role === 'teacher' && assignment.submissionStats && (
                          <div className="text-[#8E816D]">
                            {assignment.submissionStats.submitted}/
                            {assignment.submissionStats.total} submitted
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
