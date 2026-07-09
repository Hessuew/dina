import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { CalendarIcon, ClockIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import { getAssignmentSubmissionCount, getLesson } from '@/utils/assignments'
import { AssignmentDialog } from '@/components/dialog/assignment-dialog/AssignmentDialog'
import { LessonDialog } from '@/components/dialog/lesson-dialog/LessonDialog'
import { useDialogState } from '@/hooks/useDialogState'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { LessonDetailSections } from '@/components/lesson/LessonDetailSections'
import {
  buildLessonBackNavigation,
  buildLessonDialogInitialData,
  formatLessonSchedule,
  getLessonStatus,
  handleDialogDismiss,
  resolveDeleteErrorMessage,
  resolveLessonPublished,
  shouldShowLessonContent,
} from '@/utils/lessons/domain/lesson-detail.domain'

const getLessonData = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ lessonId: z.uuid() }))
  .handler(async ({ data }) => {
    return await getLesson({ data })
  })

type LessonSearch = {
  fromCalendar?: boolean
  calendarMonth?: string
}

export const Route = createFileRoute('/_authed/lessons/copy')({
  validateSearch: (search: Record<string, unknown>): LessonSearch => {
    return {
      fromCalendar: search.fromCalendar as boolean | undefined,
      calendarMonth: search.calendarMonth as string | undefined,
    }
  },
  loader: async ({ params }) => {
    const data = await getLessonData({
      data: { lessonId: (params as { lessonId: string }).lessonId },
    })
    return data
  },
  component: LessonDetailComponent,
})

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

function LessonHeaderMetadata({
  scheduleLabel,
  duration,
}: {
  scheduleLabel: string | null
  duration: number | null
}) {
  return (
    <>
      {scheduleLabel && (
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="size-3" />
          <span>{scheduleLabel}</span>
        </div>
      )}
      {duration && (
        <div className="flex items-center gap-1.5">
          <ClockIcon className="size-3" />
          <span>{duration} min</span>
        </div>
      )}
    </>
  )
}

type LessonEditDialogLesson = {
  id: string
  title: string
  content: string | null
  scheduledTime: Date | string | null
  duration: number | null
  isPublished: boolean | null
  orderIndex: number
  course: { id: string }
}

function LessonPageHeader({
  title,
  onBack,
  scheduleLabel,
  duration,
  status,
  canEdit,
  isCourseTeacher,
  onEdit,
  onDelete,
}: {
  title: string
  onBack: () => void
  scheduleLabel: string | null
  duration: number | null
  status: 'published' | 'draft'
  canEdit: boolean
  isCourseTeacher: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <PageHeader
      title={title}
      onBack={onBack}
      metadata={
        <LessonHeaderMetadata
          scheduleLabel={scheduleLabel}
          duration={duration}
        />
      }
      actions={
        <EntityHeaderActions
          status={status}
          canEdit={canEdit}
          isCourseTeacher={isCourseTeacher}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      }
    />
  )
}

type LessonDetailSectionsProps = Parameters<typeof LessonDetailSections>[0]

function LessonAssignmentsPanel({
  lesson,
  role,
  permissions,
  showContent,
  assignmentDialog,
  onDeleteAssignment,
  router,
}: {
  lesson: LessonDetailSectionsProps['lesson']
  role: LessonDetailSectionsProps['role']
  permissions: LessonDetailSectionsProps['permissions']
  showContent: boolean
  assignmentDialog: ReturnType<typeof useDialogState<Assignment>>
  onDeleteAssignment: (assignment: Assignment) => void
  router: ReturnType<typeof useRouter>
}) {
  return (
    <LessonDetailSections
      lesson={lesson}
      role={role}
      permissions={permissions}
      showContent={showContent}
      onCreateAssignment={() => assignmentDialog.openDialog('create')}
      onEditAssignment={(assignment) =>
        assignmentDialog.openDialog('edit', assignment)
      }
      onDeleteAssignment={onDeleteAssignment}
      onOpenAssignment={(assignmentId) =>
        router.navigate({
          to: '/assignments/$assignmentId',
          params: { assignmentId },
          search: {
            calendarMonth: undefined,
            fromCalendar: false,
            fromDashboard: false,
          },
        })
      }
    />
  )
}

function LessonAssignmentDialog({
  assignmentDialog,
  lessonId,
  submissionCount,
  onClose,
}: {
  assignmentDialog: ReturnType<typeof useDialogState<Assignment>>
  lessonId: string
  submissionCount: number
  onClose: () => void
}) {
  if (!assignmentDialog.isOpen) return null
  return (
    <AssignmentDialog
      open={true}
      onOpenChange={(open) =>
        handleDialogDismiss(open, () => {
          assignmentDialog.closeDialog()
          onClose()
        })
      }
      mode={assignmentDialog.dialogMode as 'create' | 'edit' | 'delete'}
      lessonId={lessonId}
      assignment={assignmentDialog.dialogItem}
      submissionCount={submissionCount}
    />
  )
}

function LessonEditDialog({
  lessonDialog,
  lesson,
}: {
  lessonDialog: ReturnType<typeof useDialogState>
  lesson: LessonEditDialogLesson
}) {
  if (!lessonDialog.isOpen) return null
  return (
    <LessonDialog
      open={true}
      onOpenChange={(open) =>
        handleDialogDismiss(open, lessonDialog.closeDialog)
      }
      mode={lessonDialog.dialogMode as 'edit' | 'delete'}
      courseId={lesson.course.id}
      initialData={buildLessonDialogInitialData(lesson)}
    />
  )
}

type LessonDetailViewProps = {
  lesson: LessonDetailSectionsProps['lesson'] & LessonEditDialogLesson
  role: LessonDetailSectionsProps['role']
  permissions: LessonDetailSectionsProps['permissions']
  showContent: boolean
  isPublished: boolean
  scheduleLabel: string | null
  goBack: () => void
  lessonDialog: ReturnType<typeof useDialogState>
  assignmentDialog: ReturnType<typeof useDialogState<Assignment>>
  submissionCount: number
  onCloseAssignmentDialog: () => void
  onDeleteAssignment: (assignment: Assignment) => void
  router: ReturnType<typeof useRouter>
}

function LessonDetailView({
  lesson,
  role,
  permissions,
  showContent,
  isPublished,
  scheduleLabel,
  goBack,
  lessonDialog,
  assignmentDialog,
  submissionCount,
  onCloseAssignmentDialog,
  onDeleteAssignment,
  router,
}: LessonDetailViewProps) {
  return (
    <PageLayout>
      <LessonPageHeader
        title={lesson.title}
        onBack={goBack}
        scheduleLabel={scheduleLabel}
        duration={lesson.duration}
        status={getLessonStatus(isPublished)}
        canEdit={permissions.canEdit}
        isCourseTeacher={permissions.isCourseTeacher}
        onEdit={() => lessonDialog.openDialog('edit')}
        onDelete={() => lessonDialog.openDialog('delete')}
      />

      <LessonAssignmentsPanel
        lesson={lesson}
        role={role}
        permissions={permissions}
        showContent={showContent}
        assignmentDialog={assignmentDialog}
        onDeleteAssignment={onDeleteAssignment}
        router={router}
      />

      <LessonAssignmentDialog
        assignmentDialog={assignmentDialog}
        lessonId={lesson.id}
        submissionCount={submissionCount}
        onClose={onCloseAssignmentDialog}
      />

      <LessonEditDialog lessonDialog={lessonDialog} lesson={lesson} />
    </PageLayout>
  )
}

function LessonDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const search = Route.useSearch()
  const { lesson, role, permissions } = loaderData
  const lessonDialog = useDialogState()
  const assignmentDialog = useDialogState<Assignment>()
  const [submissionCount, setSubmissionCount] = useState(0)
  const isPublished = resolveLessonPublished(lesson.isPublished)
  const showContent = shouldShowLessonContent(isPublished, permissions.canEdit)

  const handleDeleteAssignmentClick = async (assignment: Assignment) => {
    try {
      const result = await getAssignmentSubmissionCount({
        data: { assignmentId: assignment.id },
      })
      setSubmissionCount(result.count)
      assignmentDialog.openDialog('delete', assignment)
    } catch (error) {
      toast.error(resolveDeleteErrorMessage(error))
    }
  }

  const goBack = () => {
    const target = buildLessonBackNavigation(search, lesson.course.id)
    if (target.kind === 'calendar') {
      router.navigate({ to: '/calendar', search: { month: target.month } })
    } else {
      router.navigate({
        to: '/courses/$courseId',
        params: { courseId: target.courseId },
      })
    }
  }

  const scheduleLabel = formatLessonSchedule(lesson.scheduledTime)

  return (
    <LessonDetailView
      lesson={lesson}
      role={role}
      permissions={permissions}
      showContent={showContent}
      isPublished={isPublished}
      scheduleLabel={scheduleLabel}
      goBack={goBack}
      lessonDialog={lessonDialog}
      assignmentDialog={assignmentDialog}
      submissionCount={submissionCount}
      onCloseAssignmentDialog={() => setSubmissionCount(0)}
      onDeleteAssignment={handleDeleteAssignmentClick}
      router={router}
    />
  )
}
