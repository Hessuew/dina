import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { CalendarIcon, ClockIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import { getAssignmentSubmissionCount, getLesson } from '@/utils/assignments'
import { AssignmentDialog } from '@/components/dialog/AssignmentDialog'
import { LessonDialog } from '@/components/dialog/LessonDialog'
import { useDialogState } from '@/hooks/useDialogState'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { LessonDetailSections } from '@/components/lesson/LessonDetailSections'

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

function LessonDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const search = Route.useSearch()
  const { lesson, role, permissions } = loaderData
  const lessonDialog = useDialogState()
  const assignmentDialog = useDialogState<Assignment>()
  const [submissionCount, setSubmissionCount] = useState(0)
  const isPublished = lesson.isPublished ?? false
  const showContent = isPublished || permissions.canEdit

  const handleDeleteAssignmentClick = async (assignment: Assignment) => {
    try {
      const result = await getAssignmentSubmissionCount({
        data: { assignmentId: assignment.id },
      })
      setSubmissionCount(result.count)
      assignmentDialog.openDialog('delete', assignment)
    } catch (error: any) {
      toast.error(error.message || 'Failed to check submissions')
    }
  }

  const goBack = () => {
    if (search.fromCalendar && search.calendarMonth) {
      router.navigate({
        to: '/calendar',
        search: { month: search.calendarMonth },
      })
    } else {
      router.navigate({
        to: '/courses/$courseId',
        params: { courseId: lesson.course.id },
      })
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={lesson.title}
        onBack={goBack}
        metadata={
          <>
            {lesson.scheduledTime && (
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="size-3" />
                <span>
                  {new Date(lesson.scheduledTime).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(lesson.scheduledTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
            )}
            {lesson.duration && (
              <div className="flex items-center gap-1.5">
                <ClockIcon className="size-3" />
                <span>{lesson.duration} min</span>
              </div>
            )}
          </>
        }
        actions={
          <EntityHeaderActions
            status={isPublished ? 'published' : 'draft'}
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
          onOpenChange={(open) => {
            if (!open) {
              assignmentDialog.closeDialog()
              setSubmissionCount(0)
            }
          }}
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
          onOpenChange={(open) => {
            if (!open) lessonDialog.closeDialog()
          }}
          mode={lessonDialog.dialogMode as 'edit' | 'delete'}
          courseId={lesson.course.id}
          initialData={{
            lessonId: lesson.id,
            title: lesson.title,
            content: lesson.content,
            scheduledTime: lesson.scheduledTime
              ? new Date(lesson.scheduledTime)
              : null,
            duration: lesson.duration,
            isPublished: lesson.isPublished ?? false,
            orderIndex: lesson.orderIndex,
          }}
        />
      )}
    </PageLayout>
  )
}
