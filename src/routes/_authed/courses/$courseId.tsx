import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
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
import { and, eq } from 'drizzle-orm'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { db } from '@/db'
import { courses, lessonProgress, profiles } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'
import { useMutation } from '@/hooks/useMutation'
import { TeacherAvatars } from '@/components/avarats/TeacherAvatars'
import { CourseDialog } from '@/components/dialog/CourseDialog'
import { LessonDialog } from '@/components/dialog/LessonDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteCourse } from '@/utils/courses'
import { cn } from '@/lib/utils'

const getCourseData = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ courseId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
      with: {
        courseTeachers: {
          with: {
            teacher: true,
          },
        },
        lessons: {
          orderBy: (lessons, { asc }) => [asc(lessons.orderIndex)],
        },
      },
    })

    if (!course) {
      throw new Error('Course not found')
    }

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    let progress: Array<any> = []

    if (profile.role === 'student') {
      progress = await db.query.lessonProgress.findMany({
        where: and(
          eq(lessonProgress.studentId, user.id),
          eq(lessonProgress.completed, true),
        ),
      })
    }

    const completedLessonIds = new Set(progress.map((p) => p.lessonId))

    return {
      course: {
        ...course,
        teacher1Id: course.courseTeachers[0]?.teacherId,
        teacher2Id: course.courseTeachers[1]?.teacherId,
      },
      role: profile.role,
      completedLessonIds: Array.from(completedLessonIds),
    }
  })

export const Route = createFileRoute('/_authed/courses/$courseId')({
  loader: async ({ params }) => {
    const data = await getCourseData({ data: { courseId: params.courseId } })
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

function CourseDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const { course: c, role, completedLessonIds } = loaderData
  const course = c as typeof loaderData.course | null

  const [showEditCourseDialog, setShowEditCourseDialog] = useState(false)
  const [editCourseInitialData, setEditCourseInitialData] = useState<
    | {
        courseId: string
        title: string
        description: string
        thumbnailUrl: string | null
        isPublished: boolean
        teacher1Id: string | null
        teacher2Id: string | null
        orderIndex: number
      }
    | undefined
  >(undefined)
  const [showDeleteCourseDialog, setShowDeleteCourseDialog] = useState(false)
  const [lessonDialogMode, setLessonDialogMode] = useState<
    'create' | 'edit' | 'delete' | null
  >(null)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  const isAdmin = role === 'admin'
  const courseTeachersData = course?.courseTeachers || []
  const canEdit = role === 'teacher' || role === 'admin'
  const completedCount = completedLessonIds.length
  const totalLessons = course?.lessons.length || 0
  const progressPct =
    totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0

  const deleteCourseMutation = useMutation({
    fn: deleteCourse,
    onSuccess: async () => {
      toast.success('Course deleted successfully!')
      await router.navigate({ to: '/dashboard' })
    },
  })

  const openLessonDialog = (
    mode: 'create' | 'edit' | 'delete',
    lesson?: Lesson,
  ) => {
    setSelectedLesson(lesson ?? null)
    setLessonDialogMode(mode)
  }

  const closeLessonDialog = () => setLessonDialogMode(null)

  return (
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
        {/* Page header */}
        <div className="mb-10">
          <button
            type="button"
            onClick={() => router.navigate({ to: '/dashboard' })}
            className="mb-6 flex items-center gap-2 text-[0.72rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase transition-colors hover:text-[#C5A059]"
          >
            <ChevronLeft className="size-3.5" />
            Dashboard
          </button>

          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="h-px w-10 bg-[#C5A059]/50" />
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
                {course?.title}
              </h1>
              {course?.courseTeachers && course.courseTeachers.length > 0 && (
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
              {canEdit && (
                <>
                  <div
                    className={cn(
                      'border px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.22em] uppercase',
                      course?.isPublished
                        ? 'border-[#C5A059]/40 bg-[#C5A059]/8 text-[#9B7A41]'
                        : 'border-[#1A1A1A]/12 bg-[#1A1A1A]/4 text-[#8E816D]',
                    )}
                  >
                    {course?.isPublished ? 'Published' : 'Draft'}
                  </div>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] transition-all hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
                    onClick={() => {
                      if (course) {
                        setEditCourseInitialData({
                          courseId: course.id,
                          title: course.title,
                          description: course.description || '',
                          thumbnailUrl: course.thumbnailUrl,
                          isPublished: course.isPublished ?? false,
                          teacher1Id:
                            courseTeachersData[0]?.teacher?.id || null,
                          teacher2Id:
                            courseTeachersData[1]?.teacher?.id || null,
                          orderIndex: course.orderIndex ?? 0,
                        })
                      }
                      setShowEditCourseDialog(true)
                    }}
                  >
                    <PencilIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] transition-all hover:border-red-300 hover:text-red-600"
                    onClick={() => setShowDeleteCourseDialog(true)}
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Left column — course info + progress */}
          <div className="space-y-6">
            {/* Course info card */}
            <div className="border border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.10)]">
              {course?.thumbnailUrl && (
                <div className="relative overflow-hidden border-b border-[#1A1A1A]/8">
                  <div
                    className="min-h-48 bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.10), rgba(7,7,8,0.50)), url(${course.thumbnailUrl})`,
                    }}
                  />
                </div>
              )}
              <div className="px-6 py-6">
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  About this course
                </div>
                {course?.description ? (
                  <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#4E463D]">
                    {course.description}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-[#9B8C7C] italic">
                    No description provided.
                  </p>
                )}
              </div>
            </div>

            {/* Progress card — students only */}
            {!canEdit && (
              <div className="border border-[#1A1A1A]/10 bg-[#F8F4EC] px-6 py-6 shadow-[0_16px_28px_-24px_rgba(0,0,0,0.10)]">
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Your Progress
                </div>
                <div className="mt-5 flex items-baseline justify-between">
                  <span className="font-serif text-2xl text-[#1C1815]">
                    {completedCount}
                  </span>
                  <span className="text-sm text-[#8E816D]">
                    of {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}{' '}
                    completed
                  </span>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden bg-[#1A1A1A]/8">
                  <div
                    className="h-full bg-[#C5A059] transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right column — lessons */}
          <div className="border border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.10)]">
            {/* Lessons header */}
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/8 px-6 py-5">
              <div>
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Lessons
                </div>
                <div className="mt-1 font-serif text-xl text-[#1C1815]">
                  {totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'}
                </div>
              </div>
              {canEdit && course && course.lessons.length < 3 && (
                <Button
                  theme="light"
                  onClick={() => openLessonDialog('create')}
                >
                  <PlusIcon className="size-3.5" />
                  Add Lesson
                </Button>
              )}
            </div>

            {/* Lesson list */}
            {course?.lessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpenIcon className="mb-4 size-10 text-[#C5A059]/30" />
                <p className="text-sm text-[#8E816D]">No lessons yet</p>
                {canEdit && (
                  <Button
                    theme="light"
                    className="mt-4"
                    onClick={() => openLessonDialog('create')}
                  >
                    <PlusIcon className="size-3.5" />
                    Create First Lesson
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#1A1A1A]/6">
                {course?.lessons.map((lesson: Lesson, index: number) => {
                  const isCompleted = completedLessonIds.includes(lesson.id)
                  const isPublished = lesson.isPublished ?? false
                  const showContent = isPublished || canEdit

                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        'group flex items-start gap-4 px-6 py-5 transition-all',
                        showContent
                          ? 'cursor-pointer hover:bg-[#EDE8DE]/60'
                          : 'opacity-50',
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
                          <span className="font-serif text-base text-[#1C1815] group-hover:text-[#9B7A41]">
                            {lesson.title}
                          </span>
                          {canEdit && (
                            <span
                              className={cn(
                                'border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase',
                                isPublished
                                  ? 'border-[#C5A059]/40 text-[#9B7A41]'
                                  : 'border-[#1A1A1A]/12 text-[#8E816D]',
                              )}
                            >
                              {isPublished ? 'Published' : 'Draft'}
                            </span>
                          )}
                        </div>

                        {showContent && lesson.content && (
                          <p className="mt-1 line-clamp-2 text-sm whitespace-pre-wrap text-[#6B5F4D]">
                            {lesson.content}
                          </p>
                        )}

                        {showContent && (
                          <div className="mt-2 flex items-center gap-4 text-[0.68rem] text-[#9B8C7C]">
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
                            <button
                              type="button"
                              className="flex size-8 items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4] transition-all hover:border-[#D6B16E]"
                              onClick={() =>
                                router.navigate({
                                  to: '/lessons/$lessonId',
                                  params: { lessonId: lesson.id },
                                })
                              }
                            >
                              <ArrowRight className="size-3.5" />
                            </button>
                          ))}
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center border border-[#1A1A1A]/10 text-[#8E816D] transition-all hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
                              onClick={() => openLessonDialog('edit', lesson)}
                            >
                              <PencilIcon className="size-3" />
                            </button>
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center border border-[#1A1A1A]/10 text-[#8E816D] transition-all hover:border-red-300 hover:text-red-500"
                              onClick={() => openLessonDialog('delete', lesson)}
                            >
                              <TrashIcon className="size-3" />
                            </button>
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
      </div>

      {/* Edit Course Dialog */}
      <CourseDialog
        open={showEditCourseDialog}
        onOpenChange={setShowEditCourseDialog}
        mode="edit"
        isAdmin={isAdmin}
        initialData={editCourseInitialData}
      />

      {/* Delete Course Dialog */}
      <Dialog
        open={showDeleteCourseDialog}
        onOpenChange={setShowDeleteCourseDialog}
      >
        <DialogContent
          className="rounded-none border border-[#C5A059]/20 shadow-[0_28px_60px_-32px_rgba(0,0,0,0.22)]"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#1C1815]">
              Delete Course
            </DialogTitle>
            <DialogDescription className="text-[#4E463D]">
              Are you sure you want to delete "{course?.title}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setShowDeleteCourseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-none"
              onClick={() => {
                if (course) {
                  deleteCourseMutation.mutate({ data: { courseId: course.id } })
                }
              }}
              disabled={deleteCourseMutation.status === 'pending'}
            >
              {deleteCourseMutation.status === 'pending'
                ? 'Deleting...'
                : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog (create / edit / delete) */}
      {lessonDialogMode !== null && course && (
        <LessonDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) closeLessonDialog()
          }}
          mode={lessonDialogMode}
          courseId={course.id}
          lessonCount={course.lessons.length}
          initialData={
            selectedLesson
              ? {
                  lessonId: selectedLesson.id,
                  title: selectedLesson.title,
                  content: selectedLesson.content,
                  scheduledTime: selectedLesson.scheduledTime,
                  duration: selectedLesson.duration,
                  isPublished: selectedLesson.isPublished ?? false,
                  orderIndex: selectedLesson.orderIndex,
                }
              : undefined
          }
        />
      )}
    </div>
  )
}
