import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  CalendarIcon,
  ChevronLeft,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import { Button } from '@/components/ui/button'
import { getAssignmentSubmissionCount, getLesson } from '@/utils/assignments'
import { AssignmentDialog } from '@/components/dialog/AssignmentDialog'
import { LessonDialog } from '@/components/dialog/LessonDialog'
import { cn } from '@/lib/utils'
import { useDialogState } from '@/hooks/useDialogState'
import { PageLayout } from '@/components/layout/page-layout'
import { isUserCourseTeacher } from '@/utils/teachers'

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
  const { lesson, role, user } = loaderData
  const lessonDialog = useDialogState()
  const assignmentDialog = useDialogState<Assignment>()
  const [submissionCount, setSubmissionCount] = useState(0)
  const isCourseTeacher =
    isUserCourseTeacher(lesson.course, user.id) || role === 'admin'
  const canEdit = role === 'teacher' || role === 'admin'
  const isPublished = lesson.isPublished ?? false
  const showContent = isPublished || canEdit

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return 'Published'
      case 'closed':
        return 'Closed'
      default:
        return 'Draft'
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
      {/* Page header */}
      <div className="mb-10">
        <Button
          variant="ghost"
          theme="light"
          size="sm"
          className="mb-6 gap-1"
          onClick={goBack}
        >
          <ChevronLeft className="size-3.5" />
          Back
        </Button>

        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="h-px w-10 bg-[#C5A059]/50" />
            <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
              {lesson.title}
            </h1>
            <div className="mt-3 flex items-center gap-4 text-[0.68rem] text-[#9B8C7C]">
              {lesson.scheduledTime && (
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3" />
                  <span>
                    {new Date(lesson.scheduledTime).toLocaleDateString(
                      'en-US',
                      {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      },
                    )}{' '}
                    at{' '}
                    {new Date(lesson.scheduledTime).toLocaleTimeString(
                      'en-US',
                      {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      },
                    )}
                  </span>
                </div>
              )}
              {lesson.duration && (
                <div className="flex items-center gap-1.5">
                  <ClockIcon className="size-3" />
                  <span>{lesson.duration} min</span>
                </div>
              )}
            </div>
          </div>

          {canEdit && isCourseTeacher && (
            <div className="flex items-center gap-3 pt-4">
              <div
                className={cn(
                  'border px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.22em] uppercase',
                  isPublished
                    ? 'border-[#C5A059]/40 bg-[#C5A059]/8 text-[#9B7A41]'
                    : 'border-white/12 bg-white/4 text-[#8E816D]',
                )}
              >
                {isPublished ? 'Published' : 'Draft'}
              </div>
              <Button
                variant="ghost"
                theme="light"
                size="icon"
                className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
                onClick={() => lessonDialog.openDialog('edit')}
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                theme="light"
                size="icon"
                className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-red-300 hover:text-red-600"
                onClick={() => lessonDialog.openDialog('delete')}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Left — lesson content */}
        <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
          <div className="bg-[#151515]/88 px-6 py-6">
            <div className="h-px w-8 bg-[#C5A059]/40" />
            <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
              Lesson Content
            </div>
            {!showContent ? (
              <div className="mt-8 text-center">
                <p className="text-sm text-[#8E816D] italic">
                  This lesson is not yet available.
                </p>
              </div>
            ) : lesson.content ? (
              <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#CFC6B7]">
                {lesson.content}
              </p>
            ) : (
              <p className="mt-4 text-sm text-[#8E816D] italic">
                No content provided.
              </p>
            )}
          </div>
        </div>

        {/* Right — assignments */}
        <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
            <div>
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                Assignments
              </div>
              <div className="mt-1 font-serif text-xl text-[#F8F4EC]">
                {lesson.assignments.length}{' '}
                {lesson.assignments.length === 1 ? 'Assignment' : 'Assignments'}
              </div>
            </div>
            {canEdit && isCourseTeacher && (
              <Button
                theme="dark"
                onClick={() => assignmentDialog.openDialog('create')}
              >
                <PlusIcon className="size-3.5" />
                Add Assignment
              </Button>
            )}
          </div>

          {lesson.assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-[#AFA28F]">No assignments yet</p>
              {canEdit && isCourseTeacher && (
                <Button
                  theme="dark"
                  className="mt-4"
                  onClick={() => assignmentDialog.openDialog('create')}
                >
                  <PlusIcon className="size-3.5" />
                  Create First Assignment
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/8">
              {lesson.assignments
                .filter((a: Assignment) =>
                  role === 'student' ? a.status === 'published' : true,
                )
                .map((assignment: Assignment) => {
                  const statusColors = {
                    published: 'border-[#C5A059]/40 text-[#9B7A41]',
                    closed: 'border-red-400/50 text-red-400',
                    draft: 'border-white/12 text-[#8E816D]',
                  }
                  return (
                    <div
                      key={assignment.id}
                      className="group flex items-start gap-4 px-6 py-5 transition-all hover:bg-white/5"
                    >
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() =>
                          router.navigate({
                            to: '/assignments/$assignmentId',
                            params: { assignmentId: assignment.id },
                            search: {
                              calendarMonth: undefined,
                              fromCalendar: false,
                              fromDashboard: false,
                            },
                          })
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-[0.62rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
                            {assignment.title}
                          </span>
                          <span
                            className={cn(
                              'border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase',
                              statusColors[assignment.status],
                            )}
                          >
                            {getStatusLabel(assignment.status)}
                          </span>
                        </div>
                        {assignment.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-[#CFC6B7]">
                            {assignment.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-4 text-[0.68rem] text-[#8E816D]">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="size-3" />
                            <span>
                              Due{' '}
                              {new Date(
                                assignment.dueDate,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <span>Max: {assignment.maxGrade ?? 100} pts</span>
                        </div>
                      </div>
                      {canEdit && isCourseTeacher && (
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="ghost"
                            theme="dark"
                            size="icon"
                            className="size-7 border border-white/10 text-[#8E816D] hover:border-[#C5A059]/40 hover:text-[#D4B373]"
                            onClick={() => {
                              assignmentDialog.openDialog('edit', assignment)
                            }}
                          >
                            <PencilIcon className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            theme="dark"
                            size="icon"
                            className="size-7 border border-white/10 text-[#8E816D] hover:border-red-400/50 hover:text-red-400"
                            onClick={() =>
                              handleDeleteAssignmentClick(assignment)
                            }
                          >
                            <TrashIcon className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

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
