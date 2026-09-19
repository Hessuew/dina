import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { CalendarIcon, ClockIcon } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { toast } from 'sonner'
import { useDialogState } from '@/hooks/useDialogState'
import { useMutation } from '@/hooks/useMutation'
import { createOrUpdateSubmission, getAssignment } from '@/utils/assignments'
import {
  buildInitialSubmissionFormData,
  deriveSubmissionPermissions,
  formatSubmissionGrade,
  formatSubmittedDate,
  navigateAfterDelete,
  navigateBack,
  resolveEditDialogMode,
  resolveSubmissionStatusVariant,
  shouldLoadAssignmentSubmissions,
} from '@/utils/assignments/domain/assignment-detail.domain'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { AssignmentDetailSections } from '@/components/assignment/assignment-detail-sections/AssignmentDetailSections'
import { trackAssignmentSubmitted } from '@/utils/analytics'

const AssignmentDialog = lazy(() =>
  import('@/components/dialog/assignment-dialog/AssignmentDialog').then(
    (module) => ({ default: module.AssignmentDialog }),
  ),
)

const getAssignmentData = createServerFn({ method: 'POST' })
  .validator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    try {
      return await getAssignment({ data })
    } catch (error) {
      console.error('Failed to fetch assignment:', error)
      throw error
    }
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
    return await getAssignmentData({
      data: { assignmentId: params.assignmentId },
    })
  },
  component: AssignmentDetailComponent,
})

type SubmissionWithStudent = {
  id: string
  content: string | null
  status: 'draft' | 'submitted' | 'graded' | 'returned'
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

type AssignmentDetailData = ReturnType<typeof Route.useLoaderData>
type AssignmentData = AssignmentDetailData['assignment']

function useAssignmentNavigation() {
  const router = useRouter()
  const { fromDashboard, fromCalendar, calendarMonth } = Route.useSearch()

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

  const buildDeleteSuccessHandler = (lessonId: string) => () => {
    navigateAfterDelete(
      { fromDashboard },
      {
        toAssignments: () => router.navigate({ to: '/assignments' }),
        toLesson: () =>
          router.navigate({
            to: '/lessons/$lessonId',
            params: { lessonId },
          }),
      },
    )
  }

  return { goBack, buildDeleteSuccessHandler }
}

function useSubmissionForm(
  assignmentId: string,
  submission: AssignmentDetailData['submission'],
) {
  const router = useRouter()
  const [submissionFormData, setSubmissionFormData] = useState(
    buildInitialSubmissionFormData(submission),
  )

  const submissionMutation = useMutation({
    fn: createOrUpdateSubmission,
    onSuccess: async () => {
      toast.success('Submission saved successfully!')
      try {
        await router.invalidate()
      } catch (error) {
        console.error('Failed to refresh assignment data:', error)
        toast.warning('Submission saved, but the page may need a refresh.')
      }
    },
  })

  const handleSaveSubmission = async (submit: boolean = false) => {
    const result = await submissionMutation.mutate({
      data: {
        assignmentId,
        content: submissionFormData.content,
        submit,
      },
    })

    if (submit && result) trackAssignmentSubmitted(assignmentId)
  }

  return {
    submissionFormData,
    setSubmissionFormData,
    submissionMutation,
    handleSaveSubmission,
  }
}

function useAssignmentDetail() {
  const { assignment, submission, role, allSubmissions, permissions } =
    Route.useLoaderData()
  const nav = useAssignmentNavigation()
  const submissionForm = useSubmissionForm(assignment.id, submission)

  const assignmentDialog = useDialogState()
  const gradeDialog = useDialogState<SubmissionWithStudent>()

  const { isStudent, isPastDue, canSubmit } = deriveSubmissionPermissions({
    role,
    status: assignment.status,
    dueDate: assignment.dueDate,
  })
  const showSubmissionsPanel =
    isStudent || shouldLoadAssignmentSubmissions(permissions.canManage)

  const editDialogMode = resolveEditDialogMode({
    mode: assignmentDialog.dialogMode,
    isOpen: assignmentDialog.isOpen,
  })

  return {
    assignment,
    submission,
    allSubmissions,
    permissions,
    assignmentDialog,
    gradeDialog,
    isStudent,
    isPastDue,
    canSubmit,
    showSubmissionsPanel,
    editDialogMode,
    submissionForm,
    goBack: nav.goBack,
    buildDeleteSuccessHandler: nav.buildDeleteSuccessHandler,
  }
}

function AssignmentDueMetadata({
  dueDate,
  courseTitle,
}: {
  dueDate: AssignmentData['dueDate']
  courseTitle: string
}) {
  return (
    <>
      <span className="tracking-wides">{courseTitle}</span>
      <span className="text-[#C5A059]/40">·</span>
      <div className="flex items-center gap-1.5">
        <CalendarIcon className="size-3" />
        <span>
          Due{' '}
          {new Date(dueDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <ClockIcon className="size-3" />
        <span>
          {new Date(dueDate).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </span>
      </div>
    </>
  )
}

function AssignmentDetailHeader({
  assignment,
  permissions,
  onBack,
  onEdit,
  onDelete,
}: {
  assignment: AssignmentData
  permissions: AssignmentDetailData['permissions']
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <PageHeader
      title={assignment.title}
      onBack={onBack}
      metadata={
        <AssignmentDueMetadata
          dueDate={assignment.dueDate}
          courseTitle={assignment.lesson.course.title}
        />
      }
      actions={
        <EntityHeaderActions
          status={assignment.status}
          canEdit={permissions.canEdit}
          isCourseTeacher={permissions.isCourseTeacher}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      }
    />
  )
}

function AssignmentDetailDialogs({
  assignment,
  editDialogMode,
  assignmentDialog,
  gradeDialog,
  onDeleteSuccess,
}: {
  assignment: AssignmentData
  editDialogMode: ReturnType<typeof resolveEditDialogMode>
  assignmentDialog: ReturnType<typeof useDialogState>
  gradeDialog: ReturnType<typeof useDialogState<SubmissionWithStudent>>
  onDeleteSuccess: () => void
}) {
  return (
    <Suspense fallback={null}>
      {/* Assignment Dialog (edit / delete) */}
      {editDialogMode && (
        <AssignmentDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) assignmentDialog.closeDialog()
          }}
          mode={editDialogMode}
          assignment={assignment}
          onDeleteSuccess={onDeleteSuccess}
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
    </Suspense>
  )
}

function AssignmentDetailComponent() {
  const {
    assignment,
    submission,
    allSubmissions,
    permissions,
    assignmentDialog,
    gradeDialog,
    isStudent,
    isPastDue,
    canSubmit,
    showSubmissionsPanel,
    editDialogMode,
    submissionForm,
    goBack,
    buildDeleteSuccessHandler,
  } = useAssignmentDetail()

  return (
    <PageLayout>
      <AssignmentDetailHeader
        assignment={assignment}
        permissions={permissions}
        onBack={goBack}
        onEdit={() => assignmentDialog.openDialog('edit')}
        onDelete={() => assignmentDialog.openDialog('delete')}
      />

      <AssignmentDetailSections
        assignment={assignment}
        submission={submission}
        allSubmissions={allSubmissions}
        isStudent={isStudent}
        isPastDue={isPastDue}
        canSubmit={canSubmit}
        showSubmissionsPanel={showSubmissionsPanel}
        submissionFormData={submissionForm.submissionFormData}
        isSavingSubmission={submissionForm.submissionMutation.isPending}
        onChangeSubmissionFormData={submissionForm.setSubmissionFormData}
        onSaveSubmission={submissionForm.handleSaveSubmission}
        onGradeSubmission={(submissionToGrade) =>
          gradeDialog.openDialog('edit', submissionToGrade)
        }
      />

      <AssignmentDetailDialogs
        assignment={assignment}
        editDialogMode={editDialogMode}
        assignmentDialog={assignmentDialog}
        gradeDialog={gradeDialog}
        onDeleteSuccess={buildDeleteSuccessHandler(assignment.lesson.id)}
      />
    </PageLayout>
  )
}
