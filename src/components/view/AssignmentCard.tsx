import { ArrowRight, CalendarIcon } from 'lucide-react'
import type { Assignment } from '@/components/view/assignments-view/AssignmentsView'
import type { AssignmentRole } from '@/components/view/assignments-view/assignments-view.domain'
import { buildAssignmentCardViewModel } from '@/components/view/assignments-view/assignments-view.domain'
import { ButtonLink } from '@/components/ui/button-link'
import { StatusChip } from '@/components/ui/status-chip'
import { cn } from '@/lib/utils'

type AssignmentCardProps = {
  assignment: Assignment
  role: AssignmentRole
}

export function AssignmentCard({ assignment, role }: AssignmentCardProps) {
  const {
    overdue,
    statusChipVariant,
    footerMode,
    dueDateClassName,
    gradeText,
    submittedText,
    gradedText,
  } = buildAssignmentCardViewModel(assignment, role)

  return (
    <div className="group border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] transition-all hover:border-[#C5A059]/30">
      <div className="bg-[#151515]/88 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="mt-1 h-px w-6 shrink-0 bg-[#C5A059]/40" />
          <StatusChip variant={statusChipVariant} size="sm" />
        </div>
        <h4 className="mt-2 font-serif text-base leading-snug text-[#F8F4EC]">
          {assignment.title}
        </h4>
        <p className="mt-1 text-[0.72rem] text-[#AFA28F]">
          {assignment.lesson.title}
        </p>
      </div>

      <div className="border-t border-white/8 bg-[#151515]/88 px-5 py-3 pb-2">
        <div className="flex items-center gap-1.5 text-[0.68rem] text-[#8E816D]">
          <CalendarIcon className="size-3" />
          <span className={cn(dueDateClassName)}>
            Due {new Date(assignment.dueDate).toLocaleDateString()}
          </span>
          {overdue && (
            <span className="ml-auto border border-red-400/50 px-1.5 py-0.5 text-[0.52rem] font-medium tracking-[0.15em] text-red-400 uppercase">
              Overdue
            </span>
          )}
        </div>

        {footerMode === 'grade' && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
              Grade
            </span>
            <span className="font-serif text-sm text-[#E9D9B4]">
              {gradeText}
            </span>
          </div>
        )}

        {footerMode === 'stats' && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                Submitted
              </span>
              <span className="text-[0.72rem] font-medium text-[#CFC6B7]">
                {submittedText}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                Graded
              </span>
              <span className="text-[0.72rem] font-medium text-[#CFC6B7]">
                {gradedText}
              </span>
            </div>
          </div>
        )}

        {/* Footer action row */}
        <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
          <span className="text-[0.68rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
            View assignment
          </span>

          <ButtonLink
            to="/assignments/$assignmentId"
            params={{ assignmentId: assignment.id }}
            search={{
              calendarMonth: undefined,
              fromDashboard: false,
              fromCalendar: false,
            }}
            className={cn(
              'flex size-8 cursor-pointer items-center justify-center border transition-all',
              'border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4]',
            )}
          >
            <ArrowRight className="size-3.5" />
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
