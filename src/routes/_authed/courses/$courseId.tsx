import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpenIcon,
  CalendarIcon,
  ChevronLeft,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDialogState } from '@/hooks/useDialogState'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { useMutation } from '@/hooks/useMutation'
import { TeacherAvatars } from '@/components/avatars/TeacherAvatars'
import { CourseDialog } from '@/components/dialog/CourseDialog'
import { LessonDialog } from '@/components/dialog/LessonDialog'
import { deleteCourse, getCourse } from '@/utils/courses'
import { cn } from '@/lib/utils'
import { isUserCourseTeacher } from '@/utils/teachers'
import { PageLayout } from '@/components/layout/page-layout'

export const Route = createFileRoute('/_authed/courses/$courseId')({
  loader: async ({ params }) => {
    const data = await getCourse({ data: { courseId: params.courseId } })
    return data
  },
  component: CourseDetailComponent,
})

type Lesson = {
  id: string
  title: string
  content: string | null
  scheduledTime: Date | null
  duration: number | null
  isPublished: boolean | null
  orderIndex: number
}

type CourseEditData = {
  courseId: string
  title: string
  description: string
  thumbnailUrl: string | null
  isPublished: boolean
  teacher1Id: string | null
  teacher2Id: string | null
  orderIndex: number
}

function CourseDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const { course, role, completedLessonIds, assignmentData, user } = loaderData

  const courseDialog = useDialogState<CourseEditData>()
  const lessonDialog = useDialogState<Lesson>()

  const isAdmin = role === 'admin'
  const courseTeachersData = course.courseTeachers
  const isCourseTeacher =
    isUserCourseTeacher(course, user.id) || role === 'admin'
  const canEdit = role === 'teacher' || role === 'admin'
  const totalLessons = course.lessons.length || 0

  const deleteCourseMutation = useMutation({
    fn: deleteCourse,
    onSuccess: () => {
      toast.success('Course deleted successfully!')
    },
  })

  return (
    <PageLayout>
      {/* Page header */}
      <div className="mb-10">
        <Button
          variant="ghost"
          theme="light"
          size="sm"
          className="mb-6 gap-1"
          onClick={() => router.navigate({ to: '/dashboard' })}
        >
          <ChevronLeft className="size-3.5" />
          Back
        </Button>

        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="h-px w-10 bg-[#C5A059]/50" />
            <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
              {course.title}
            </h1>
            {course.courseTeachers.length > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[0.65rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
                  Teachers
                </span>
                <TeacherAvatars
                  teachers={course.courseTeachers.map((ct) => ct.teacher)}
                  size="sm"
                  showTooltip={true}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4">
            {canEdit && isCourseTeacher && (
              <>
                <div
                  className={cn(
                    'border px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.22em] uppercase',
                    course.isPublished
                      ? 'border-[#C5A059]/40 bg-[#C5A059]/8 text-[#9B7A41]'
                      : 'border-[#1A1A1A]/12 bg-[#1A1A1A]/4 text-[#8E816D]',
                  )}
                >
                  {course.isPublished ? 'Published' : 'Draft'}
                </div>
                <Button
                  variant="ghost"
                  theme="light"
                  size="icon"
                  className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
                  onClick={() => {
                    courseDialog.openDialog('edit', {
                      courseId: course.id,
                      title: course.title,
                      description: course.description || '',
                      thumbnailUrl: course.thumbnailUrl,
                      isPublished: course.isPublished ?? false,
                      teacher1Id: courseTeachersData[0]?.teacher?.id || null,
                      teacher2Id: courseTeachersData[1]?.teacher?.id || null,
                      orderIndex: course.orderIndex ?? 0,
                    })
                  }}
                >
                  <PencilIcon className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  theme="light"
                  size="icon"
                  className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-red-300 hover:text-red-600"
                  onClick={() => courseDialog.openDialog('delete')}
                >
                  <TrashIcon className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left column — course info + progress */}
        <div className="space-y-6">
          {/* Course info card */}
          <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
            {course.thumbnailUrl && (
              <div className="relative overflow-hidden border-b border-white/10">
                <div
                  className="relative min-h-72 bg-cover bg-center sm:min-h-80"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.18), rgba(7,7,8,0.68)), url(${course.thumbnailUrl})`,
                  }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%,rgba(197,160,89,0.10)_100%)]" />
                </div>
              </div>
            )}
            <div className="bg-[#151515]/88 px-6 py-6">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                About this course
              </div>
              {course.description ? (
                <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#CFC6B7]">
                  {course.description}
                </p>
              ) : (
                <p className="mt-4 text-sm text-[#8E816D] italic">
                  No description provided.
                </p>
              )}
            </div>
          </div>

          {/* Progress card — students only */}
          {!canEdit && (
            <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
              <div className="bg-[#151515]/88 px-6 py-6">
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Your Progress
                </div>
                <div className="mt-5 flex items-baseline justify-between">
                  <span className="font-serif text-2xl text-[#E9D9B4]">
                    {assignmentData.submittedCount + assignmentData.gradedCount}
                  </span>
                  <span className="text-[0.68rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
                    of {assignmentData.totalAssignments} assignment
                    {assignmentData.totalAssignments !== 1 ? 's' : ''} submitted
                  </span>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden bg-white/8">
                  <div className="flex h-full">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{
                        width: `${assignmentData.totalAssignments > 0 ? (assignmentData.submittedCount / assignmentData.totalAssignments) * 100 : 0}%`,
                      }}
                    />
                    <div
                      className="h-full bg-[#9B7A41] transition-all"
                      style={{
                        width: `${assignmentData.totalAssignments > 0 ? (assignmentData.gradedCount / assignmentData.totalAssignments) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="mt-2 text-[0.65rem] font-medium tracking-[0.12em] text-[#8E816D]">
                  {assignmentData.submittedCount} submitted,{' '}
                  {assignmentData.gradedCount} graded (
                  {Math.round(
                    (assignmentData.totalAssignments > 0
                      ? (assignmentData.submittedCount +
                          assignmentData.gradedCount) /
                        assignmentData.totalAssignments
                      : 0) * 100,
                  )}
                  %) of {assignmentData.totalAssignments} assignments
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right column — lessons */}
        <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
          {/* Lessons header */}
          <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
            <div>
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                Lessons
              </div>
              <div className="mt-1 font-serif text-xl text-[#F8F4EC]">
                {totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'}
              </div>
            </div>
            {canEdit && isCourseTeacher && course.lessons.length < 3 && (
              <Button
                theme="dark"
                onClick={() => lessonDialog.openDialog('create')}
              >
                <PlusIcon className="size-3.5" />
                Add Lesson
              </Button>
            )}
          </div>

          {/* Lesson list */}
          {course.lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpenIcon className="mb-4 size-10 text-[#C5A059]/30" />
              <p className="text-sm text-[#AFA28F]">No lessons yet</p>
              {canEdit && isCourseTeacher && (
                <Button
                  theme="dark"
                  className="mt-4"
                  onClick={() => lessonDialog.openDialog('create')}
                >
                  <PlusIcon className="size-3.5" />
                  Create First Lesson
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/8">
              {course.lessons.map((lesson: Lesson, index: number) => {
                const isCompleted = completedLessonIds.includes(lesson.id)
                const isPublished = lesson.isPublished ?? false
                const showContent = isPublished || canEdit

                return (
                  <div
                    key={lesson.id}
                    className={cn(
                      'group flex items-start gap-4 px-6 py-5 transition-all',
                      showContent
                        ? 'cursor-pointer hover:bg-white/5'
                        : 'opacity-40',
                    )}
                    onClick={() => {
                      if (showContent) {
                        router.navigate({
                          to: '/lessons/$lessonId',
                          params: { lessonId: lesson.id },
                        })
                      }
                    }}
                  >
                    {/* Number badge */}
                    <div className="flex size-8 shrink-0 items-center justify-center border border-[#C5A059]/40 bg-[#1A1716] font-serif text-xs text-[#E9D9B4]">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.62rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
                          {lesson.title}
                        </span>
                        {canEdit && isCourseTeacher && (
                          <StatusChip
                            variant={isPublished ? 'published' : 'draft'}
                            size="sm"
                          />
                        )}
                      </div>

                      {showContent && lesson.content && (
                        <p className="mt-1 line-clamp-2 text-sm whitespace-pre-wrap text-[#CFC6B7]">
                          {lesson.content}
                        </p>
                      )}

                      {showContent && (
                        <div className="mt-2 flex items-center gap-4 text-[0.68rem] text-[#8E816D]">
                          {lesson.duration && (
                            <div className="flex items-center gap-1">
                              <ClockIcon className="size-3" />
                              <span>{lesson.duration} min</span>
                            </div>
                          )}
                          {lesson.scheduledTime && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="size-3" />
                              <span>
                                {new Date(
                                  lesson.scheduledTime,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right actions */}
                    <div
                      className="flex shrink-0 items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {role === 'student' &&
                        isPublished &&
                        (isCompleted ? (
                          <span className="border border-[#C5A059]/40 px-2.5 py-1 text-[0.6rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase">
                            Completed
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            theme="dark"
                            size="icon"
                            className="size-8 border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] hover:border-[#D6B16E]"
                            onClick={() =>
                              router.navigate({
                                to: '/lessons/$lessonId',
                                params: { lessonId: lesson.id },
                              })
                            }
                          >
                            <ArrowRight className="size-3.5" />
                          </Button>
                        ))}
                      {canEdit && isCourseTeacher && (
                        <>
                          <Button
                            variant="ghost"
                            theme="dark"
                            size="icon"
                            className="size-7 border border-white/10 text-[#8E816D] hover:border-[#C5A059]/40 hover:text-[#D4B373]"
                            onClick={() =>
                              lessonDialog.openDialog('edit', lesson)
                            }
                          >
                            <PencilIcon className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            theme="dark"
                            size="icon"
                            className="size-7 border border-white/10 text-[#8E816D] hover:border-red-400/50 hover:text-red-400"
                            onClick={() =>
                              lessonDialog.openDialog('delete', lesson)
                            }
                          >
                            <TrashIcon className="size-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Course Dialog */}
      <CourseDialog
        open={courseDialog.isOpen && courseDialog.dialogMode === 'edit'}
        onOpenChange={(open) => !open && courseDialog.closeDialog()}
        mode="edit"
        isAdmin={isAdmin}
        initialData={courseDialog.dialogItem}
      />

      {/* Delete Course Dialog */}
      <DeleteConfirmDialog
        open={courseDialog.isOpen && courseDialog.dialogMode === 'delete'}
        onOpenChange={(open) => !open && courseDialog.closeDialog()}
        entityName="Course"
        onConfirm={() =>
          deleteCourseMutation.mutate({
            data: { courseId: course.id },
          })
        }
        isDeleting={deleteCourseMutation.isPending}
        navigateTo="/dashboard"
      />

      {/* Lesson Dialog (create / edit / delete) */}
      {lessonDialog.isOpen && (
        <LessonDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) lessonDialog.closeDialog()
          }}
          mode={lessonDialog.dialogMode as 'create' | 'edit' | 'delete'}
          courseId={course.id}
          lessonCount={course.lessons.length}
          initialData={
            lessonDialog.dialogItem
              ? {
                  ...lessonDialog.dialogItem,
                  lessonId: lessonDialog.dialogItem.id,
                }
              : undefined
          }
        />
      )}
    </PageLayout>
  )
}
