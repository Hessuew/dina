import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { CalendarIcon, ClockIcon, PencilIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { StatusChip } from '@/components/ui/status-chip'
import { createButtonColumn } from '@/components/table/DataTable'
import { useDialogState } from '@/hooks/useDialogState'
import { useMutation } from '@/hooks/useMutation'
import {
  createOrUpdateSubmission,
  getAssignment,
  getAssignmentSubmissions,
} from '@/utils/assignments'
import {
  buildInitialSubmissionFormData,
  deriveSubmissionPermissions,
  formatSubmissionGrade,
  formatSubmittedDate,
  navigateAfterDelete,
  navigateBack,
  resolveEditDialogMode,
  resolveSubmissionStatusVariant,
} from '@/utils/assignments/domain/assignment-detail.domain'
import { AssignmentDialog } from '@/components/dialog/assignment-dialog/AssignmentDialog'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { AssignmentDetailSections } from '@/components/assignment/assignment-detail-sections/AssignmentDetailSections'

const getAssignmentData = createServerFn({ method: 'POST' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    return await getAssignment({ data })
  })

const getSubmissionsData = createServerFn({ method: 'POST' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    return await getAssignmentSubmissions({ data })
  })

export const Route = createFileRoute('/_authed/assignments/$assignmentId')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      fromDashboard: search.fromDashboard === true,
      fromCalendar: search.fromCalendar === true,
      calendarMonth: search.calendarMonth as string | undefined,
    }
  },
  loader: async ({ params }) => {
    const assignmentData = await getAssignmentData({
      data: { assignmentId: params.assignmentId },
    })

    if (assignmentData.role === 'teacher' || assignmentData.role === 'admin') {
      const submissionsData = await getSubmissionsData({
        data: { assignmentId: params.assignmentId },
      })

      return {
        ...assignmentData,
        allSubmissions: submissionsData.submissions,
      }
    }

    const submissionsData = { submissions: [] } as any
    return {
      ...assignmentData,
      allSubmissions: submissionsData.submissions,
    }
  },
  component: AssignmentDetailComponent,
})

type SubmissionWithStudent = {
  id: string
  content: string | null
  fileUrl: string | null
  status: 'draft' | 'submitted' | 'graded'
  grade: number | null
  feedback: string | null
  submittedAt: Date | null
  gradedAt: Date | null
  student: {
    id: string
    fullName: string
    email: string
  }
}

const columnHelper = createColumnHelper<SubmissionWithStudent>()

function AssignmentDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const { fromDashboard, fromCalendar, calendarMonth } = Route.useSearch()
  const { assignment, submission, role, allSubmissions, permissions } =
    loaderData

  const assignmentDialog = useDialogState()
  const gradeDialog = useDialogState<SubmissionWithStudent>()

  const submissionsColumns: Array<ColumnDef<SubmissionWithStudent, any>> = [
    columnHelper.accessor('student.fullName', {
      cell: (info) => (
        <span className="font-serif text-sm text-[#F8F4EC]">
          {info.getValue()}
        </span>
      ),
      header: 'Student',
    }),
    columnHelper.accessor('status', {
      cell: (info) => {
        const variant = resolveSubmissionStatusVariant(info.row.original)
        return <StatusChip variant={variant} size="sm" />
      },
      header: 'Status',
    }),
    columnHelper.accessor('grade', {
      cell: (info) => (
        <span className="text-sm text-[#AFA28F]">
          {formatSubmissionGrade(info.row.original.grade, assignment.maxGrade)}
        </span>
      ),
      header: 'Grade',
    }),
    columnHelper.accessor('submittedAt', {
      cell: (info) => (
        <span className="text-sm text-[#8E816D]">
          {formatSubmittedDate(info.row.original.submittedAt)}
        </span>
      ),
      header: 'Submitted',
    }),
    createButtonColumn<SubmissionWithStudent>([
      {
        icon: PencilIcon,
        label: 'Grade',
        onClick: (sub) => {
          gradeDialog.openDialog('edit', sub)
        },
      },
    ]),
  ]

  const [submissionFormData, setSubmissionFormData] = useState(
    buildInitialSubmissionFormData(submission),
  )

  const { isStudent, isPastDue, canSubmit } = deriveSubmissionPermissions({
    role,
    status: assignment.status,
    dueDate: assignment.dueDate,
  })

  const submissionMutation = useMutation({
    fn: createOrUpdateSubmission,
    onSuccess: async () => {
      toast.success('Submission saved successfully!')
      await router.invalidate()
    },
  })

  const handleSaveSubmission = (submit: boolean = false) => {
    submissionMutation.mutate({
      data: {
        assignmentId: assignment.id,
        content: submissionFormData.content,
        fileUrl: submissionFormData.fileUrl,
        submit,
      },
    })
  }

  const goBack = () => {
    navigateBack(
      { fromCalendar, calendarMonth, fromDashboard },
      {
        toCalendar: (month) =>
          router.navigate({ to: '/calendar', search: { month } }),
        toDashboard: () => router.navigate({ to: '/dashboard' }),
        back: () => router.history.back(),
      },
    )
  }

  const editDialogMode = resolveEditDialogMode({
    mode: assignmentDialog.dialogMode,
    isOpen: assignmentDialog.isOpen,
  })

  return (
    <PageLayout>
      <PageHeader
        title={assignment.title}
        onBack={goBack}
        metadata={
          <>
            <span className="tracking-wides">
              {assignment.lesson.course.title}
            </span>
            <span className="text-[#C5A059]/40">·</span>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="size-3" />
              <span>
                Due{' '}
                {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="size-3" />
              <span>
                {new Date(assignment.dueDate).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          </>
        }
        actions={
          <EntityHeaderActions
            status={assignment.status}
            canEdit={permissions.canEdit}
            isCourseTeacher={permissions.isCourseTeacher}
            onEdit={() => assignmentDialog.openDialog('edit')}
            onDelete={() => assignmentDialog.openDialog('delete')}
          />
        }
      />

      <AssignmentDetailSections
        assignment={assignment}
        submission={submission}
        allSubmissions={allSubmissions as Array<SubmissionWithStudent>}
        submissionsColumns={submissionsColumns}
        isStudent={isStudent}
        isPastDue={isPastDue}
        canSubmit={canSubmit}
        submissionFormData={submissionFormData}
        isSavingSubmission={submissionMutation.isPending}
        onChangeSubmissionFormData={setSubmissionFormData}
        onSaveSubmission={handleSaveSubmission}
      />

      {/* Assignment Dialog (edit / delete) */}
      {editDialogMode && (
        <AssignmentDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) assignmentDialog.closeDialog()
          }}
          mode={editDialogMode}
          assignment={assignment}
          onDeleteSuccess={() => {
            navigateAfterDelete(
              { fromDashboard },
              {
                toAssignments: () => router.navigate({ to: '/assignments' }),
                toLesson: () =>
                  router.navigate({
                    to: '/lessons/$lessonId',
                    params: { lessonId: assignment.lesson.id },
                  }),
              },
            )
          }}
        />
      )}

      {/* Grade Dialog */}
      {gradeDialog.isOpen && gradeDialog.dialogItem && (
        <AssignmentDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) gradeDialog.closeDialog()
          }}
          mode="grade"
          assignment={assignment}
          submission={gradeDialog.dialogItem}
        />
      )}
    </PageLayout>
  )
}
