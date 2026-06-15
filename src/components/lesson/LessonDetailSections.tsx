import { CalendarIcon, PlusIcon } from 'lucide-react'
import type { StatusChipVariant } from '@/components/ui/status-chip'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { DarkCard } from '@/components/ui/dark-card'
import { EmptyState } from '@/components/ui/empty-state'

type Assignment = {
  id: string
  title: string
  description: string | null
  dueDate: Date
  maxGrade: number | null
  status: 'draft' | 'published' | 'closed'
  createdAt: Date
  updatedAt: Date
}

type LessonDetailSectionsProps = {
  lesson: {
    content: string | null
    assignments: Array<Assignment>
  }
  role: 'student' | 'teacher' | 'admin'
  permissions: {
    canEdit: boolean
    isCourseTeacher: boolean
  }
  showContent: boolean
  onCreateAssignment: () => void
  onEditAssignment: (assignment: Assignment) => void
  onDeleteAssignment: (assignment: Assignment) => void
  onOpenAssignment: (assignmentId: string) => void
}

function LessonContentCard({
  content,
  showContent,
}: {
  content: string | null
  showContent: boolean
}) {
  return (
    <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
      <DarkCard label="Lesson Content">
        {!showContent ? (
          <div className="mt-8 text-center">
            <p className="text-sm text-[#8E816D] italic">
              This lesson is not yet available.
            </p>
          </div>
        ) : content ? (
          <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#CFC6B7]">
            {content}
          </p>
        ) : (
          <p className="mt-4 text-sm text-[#8E816D] italic">
            No content provided.
          </p>
        )}
      </DarkCard>
    </div>
  )
}

function AssignmentsHeader({
  count,
  canManage,
  onCreateAssignment,
}: {
  count: number
  canManage: boolean
  onCreateAssignment: () => void
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
      <div>
        <div className="h-px w-8 bg-[#C5A059]/40" />
        <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
          Assignments
        </div>
        <div className="mt-1 font-serif text-xl text-[#F8F4EC]">
          {count} {count === 1 ? 'Assignment' : 'Assignments'}
        </div>
      </div>
      {canManage && (
        <Button theme="dark" onClick={onCreateAssignment}>
          <PlusIcon className="size-3.5" />
          Add Assignment
        </Button>
      )}
    </div>
  )
}

function AssignmentRow({
  assignment,
  canManage,
  onOpenAssignment,
  onEditAssignment,
  onDeleteAssignment,
}: {
  assignment: Assignment
  canManage: boolean
  onOpenAssignment: (assignmentId: string) => void
  onEditAssignment: (assignment: Assignment) => void
  onDeleteAssignment: (assignment: Assignment) => void
}) {
  return (
    <div className="group flex items-start gap-4 px-6 py-5 transition-all hover:bg-white/5">
      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={() => onOpenAssignment(assignment.id)}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[0.62rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
            {assignment.title}
          </span>
          <StatusChip
            variant={assignment.status as StatusChipVariant}
            size="sm"
          />
        </div>
        {assignment.description && (
          <p className="mt-1 line-clamp-2 text-sm text-[#CFC6B7]">
            {assignment.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-4 text-[0.68rem] text-[#8E816D]">
          <div className="flex items-center gap-1">
            <CalendarIcon className="size-3" />
            <span>Due {new Date(assignment.dueDate).toLocaleDateString()}</span>
          </div>
          <span>Max: {assignment.maxGrade ?? 100} pts</span>
        </div>
      </div>
      {canManage && (
        <div className="flex shrink-0 items-center">
          <EntityHeaderActions
            status="published"
            canEdit={true}
            isCourseTeacher={true}
            showStatus={false}
            theme="dark"
            size="lg"
            onEdit={() => onEditAssignment(assignment)}
            onDelete={() => onDeleteAssignment(assignment)}
          />
        </div>
      )}
    </div>
  )
}

function AssignmentsSection({
  assignments,
  role,
  permissions,
  onCreateAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onOpenAssignment,
}: {
  assignments: Array<Assignment>
  role: LessonDetailSectionsProps['role']
  permissions: LessonDetailSectionsProps['permissions']
  onCreateAssignment: () => void
  onEditAssignment: (assignment: Assignment) => void
  onDeleteAssignment: (assignment: Assignment) => void
  onOpenAssignment: (assignmentId: string) => void
}) {
  const canManage = permissions.canEdit && permissions.isCourseTeacher
  const visibleAssignments = assignments.filter((assignment) =>
    role === 'student' ? assignment.status === 'published' : true,
  )

  return (
    <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      <AssignmentsHeader
        count={assignments.length}
        canManage={canManage}
        onCreateAssignment={onCreateAssignment}
      />

      {assignments.length === 0 ? (
        <EmptyState
          message="No assignments yet"
          actionLabel="Create First Assignment"
          onAction={onCreateAssignment}
          showAction={canManage}
          variant="dark"
        />
      ) : (
        <div className="divide-y divide-white/8">
          {visibleAssignments.map((assignment) => (
            <AssignmentRow
              key={assignment.id}
              assignment={assignment}
              canManage={canManage}
              onOpenAssignment={onOpenAssignment}
              onEditAssignment={onEditAssignment}
              onDeleteAssignment={onDeleteAssignment}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function LessonDetailSections({
  lesson,
  role,
  permissions,
  showContent,
  onCreateAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onOpenAssignment,
}: LessonDetailSectionsProps) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <LessonContentCard content={lesson.content} showContent={showContent} />
      <AssignmentsSection
        assignments={lesson.assignments}
        role={role}
        permissions={permissions}
        onCreateAssignment={onCreateAssignment}
        onEditAssignment={onEditAssignment}
        onDeleteAssignment={onDeleteAssignment}
        onOpenAssignment={onOpenAssignment}
      />
    </div>
  )
}
