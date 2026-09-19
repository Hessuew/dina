import { CalendarIcon, PlusIcon } from 'lucide-react'
import type { StatusChipVariant } from '@/components/ui/status-chip'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { DarkCard } from '@/components/ui/dark-card'
import { EmptyState } from '@/components/ui/empty-state/EmptyState'
import { isAssignmentVisibleToViewer } from '@/utils/assignments/domain/assignment-detail.domain'

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
  isCompleted: boolean
  onCreateAssignment: () => void
  onEditAssignment: (assignment: Assignment) => void
  onDeleteAssignment: (assignment: Assignment) => void
  onOpenAssignment: (assignmentId: string) => void
  onPrefetchAssignment: (assignmentId: string) => void
}

function LessonCompletionStatus({ isCompleted }: { isCompleted: boolean }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-5">
      <div>
        <div className="text-[0.62rem] font-medium tracking-[0.25em] text-[#8E816D] uppercase">
          Lesson progress
        </div>
        <p className="mt-1 text-sm text-[#CFC6B7]">
          {isCompleted
            ? 'This lesson is part of your completed journey.'
            : 'Completes once all assignments are graded.'}
        </p>
      </div>
      {isCompleted && (
        <span className="border border-[#C5A059]/40 px-2.5 py-1 text-[0.6rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase">
          Completed
        </span>
      )}
    </div>
  )
}

function LessonContentCard({
  content,
  showContent,
  showCompletion,
  isCompleted,
}: {
  content: string | null
  showContent: boolean
  showCompletion: boolean
  isCompleted: boolean
}) {
  return (
    <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
      <DarkCard label="Lesson Content">
        <div>
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
          {showCompletion && (
            <LessonCompletionStatus isCompleted={isCompleted} />
          )}
        </div>
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
  onPrefetchAssignment,
  onEditAssignment,
  onDeleteAssignment,
}: {
  assignment: Assignment
  canManage: boolean
  onOpenAssignment: (assignmentId: string) => void
  onPrefetchAssignment: (assignmentId: string) => void
  onEditAssignment: (assignment: Assignment) => void
  onDeleteAssignment: (assignment: Assignment) => void
}) {
  return (
    <div
      className="group flex items-start gap-4 px-6 py-5 transition-all hover:bg-white/5"
      onPointerEnter={onPrefetchAssignment.bind(null, assignment.id)}
      onPointerDown={onPrefetchAssignment.bind(null, assignment.id)}
    >
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
        <AssignmentRowMeta assignment={assignment} />
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

function AssignmentRowMeta({ assignment }: { assignment: Assignment }) {
  return (
    <div className="mt-2 flex items-center gap-4 text-[0.68rem] text-[#8E816D]">
      <div className="flex items-center gap-1">
        <CalendarIcon className="size-3" />
        <span>Due {new Date(assignment.dueDate).toLocaleDateString()}</span>
      </div>
      <span>Max: {assignment.maxGrade ?? 100} pts</span>
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
  onPrefetchAssignment,
}: {
  assignments: Array<Assignment>
  role: LessonDetailSectionsProps['role']
  permissions: LessonDetailSectionsProps['permissions']
  onCreateAssignment: () => void
  onEditAssignment: (assignment: Assignment) => void
  onDeleteAssignment: (assignment: Assignment) => void
  onOpenAssignment: (assignmentId: string) => void
  onPrefetchAssignment: (assignmentId: string) => void
}) {
  const canManage = permissions.canEdit && permissions.isCourseTeacher
  const visibleAssignments = assignments.filter((assignment) =>
    isAssignmentVisibleToViewer({
      role,
      canManage,
      status: assignment.status,
    }),
  )

  return (
    <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      <AssignmentsHeader
        count={visibleAssignments.length}
        canManage={canManage}
        onCreateAssignment={onCreateAssignment}
      />

      {visibleAssignments.length === 0 ? (
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
              onPrefetchAssignment={onPrefetchAssignment}
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
  isCompleted,
  onCreateAssignment,
  onEditAssignment,
  onDeleteAssignment,
  onOpenAssignment,
  onPrefetchAssignment,
}: LessonDetailSectionsProps) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <LessonContentCard
        content={lesson.content}
        showContent={showContent}
        showCompletion={
          showContent && role === 'student' && lesson.assignments.length > 0
        }
        isCompleted={isCompleted}
      />
      <AssignmentsSection
        assignments={lesson.assignments}
        role={role}
        permissions={permissions}
        onCreateAssignment={onCreateAssignment}
        onEditAssignment={onEditAssignment}
        onDeleteAssignment={onDeleteAssignment}
        onOpenAssignment={onOpenAssignment}
        onPrefetchAssignment={onPrefetchAssignment}
      />
    </div>
  )
}
