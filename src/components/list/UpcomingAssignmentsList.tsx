import type { Assignment } from '@/components/view/AssignmentsView'
import { filterUpcomingAssignments } from '@/components/list/domain/upcoming-assignments-list.domain'
import { UpcomingAssignmentRow } from '@/components/list/UpcomingAssignmentRow'

type UpcomingAssignmentsListProps = {
  assignments: Array<Assignment>
  role: 'student' | 'teacher' | 'admin'
}

export function UpcomingAssignmentsList({
  assignments,
  role,
}: UpcomingAssignmentsListProps) {
  const now = new Date()

  const filteredAssignments = filterUpcomingAssignments(assignments, role, now)

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
            {filteredAssignments.map((assignment, idx) => (
              <UpcomingAssignmentRow
                key={assignment.id}
                assignment={assignment}
                idx={idx}
                role={role}
                now={now}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
