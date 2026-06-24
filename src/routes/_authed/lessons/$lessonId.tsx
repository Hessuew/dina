import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { CalendarIcon, ClockIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import { getAssignmentSubmissionCount, getLesson } from '@/utils/assignments'
import { AssignmentDialog } from '@/components/dialog/assignment-dialog/AssignmentDialog'
import { LessonDialog } from '@/components/dialog/LessonDialog'
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

export const Route = createFileRoute('/_authed/lessons/$lessonId')({
  validateSearch: (search: Record<string, unknown>): LessonSearch => {
    return {
      fromCalendar: search.fromCalendar as boolean | undefined,
      calendarMonth: search.calendarMonth as string | undefined,
    }
  },
  loader: async ({ params }) => {
    const data = await getLessonData({ data: { lessonId: params.lessonId } })
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
    <PageLayout>
      <PageHeader
        title={lesson.title}
        onBack={goBack}
        metadata={
          <LessonHeaderMetadata
            scheduleLabel={scheduleLabel}
            duration={lesson.duration}
          />
        }
        actions={
          <EntityHeaderActions
            status={getLessonStatus(isPublished)}
            canEdit={permissions.canEdit}
            isCourseTeacher={permissions.isCourseTeacher}
            onEdit={() => lessonDialog.openDialog('edit')}
            onDelete={() => lessonDialog.openDialog('delete')}
          />
        }
      />

      <LessonDetailSections
        lesson={lesson}
        role={role}
        permissions={permissions}
        showContent={showContent}
        onCreateAssignment={() => assignmentDialog.openDialog('create')}
        onEditAssignment={(assignment) =>
          assignmentDialog.openDialog('edit', assignment)
        }
        onDeleteAssignment={handleDeleteAssignmentClick}
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

      {/* Assignment Dialog (create / edit / delete) */}
      {assignmentDialog.isOpen && (
        <AssignmentDialog
          open={true}
          onOpenChange={(open) =>
            handleDialogDismiss(open, () => {
              assignmentDialog.closeDialog()
              setSubmissionCount(0)
            })
          }
          mode={assignmentDialog.dialogMode as 'create' | 'edit' | 'delete'}
          lessonId={lesson.id}
          assignment={assignmentDialog.dialogItem}
          submissionCount={submissionCount}
        />
      )}

      {/* Lesson Dialog (edit / delete) */}
      {lessonDialog.isOpen && (
        <LessonDialog
          open={true}
          onOpenChange={(open) =>
            handleDialogDismiss(open, lessonDialog.closeDialog)
          }
          mode={lessonDialog.dialogMode as 'edit' | 'delete'}
          courseId={lesson.course.id}
          initialData={buildLessonDialogInitialData(lesson)}
        />
      )}
    </PageLayout>
  )
}
