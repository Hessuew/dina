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
import { and, eq, inArray } from 'drizzle-orm'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { db } from '@/db'
import {
  assignments,
  courses,
  lessonProgress,
  profiles,
  submissions,
} from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'
import { useMutation } from '@/hooks/useMutation'
import { TeacherAvatars } from '@/components/avatars/TeacherAvatars'
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
    let assignmentData: {
      totalAssignments: number
      submittedCount: number
      gradedCount: number
    } = { totalAssignments: 0, submittedCount: 0, gradedCount: 0 }

    if (profile.role === 'student') {
      progress = await db.query.lessonProgress.findMany({
        where: and(
          eq(lessonProgress.studentId, user.id),
          eq(lessonProgress.completed, true),
        ),
      })

      const lessonIds = course.lessons.map((l) => l.id)
      const courseAssignments =
        lessonIds.length > 0
          ? await db.query.assignments.findMany({
              where: inArray(assignments.lessonId, lessonIds),
            })
          : []

      const assignmentIds = courseAssignments.map((a) => a.id)
      const studentSubmissions =
        assignmentIds.length > 0
          ? await db.query.submissions.findMany({
              where: and(
                eq(submissions.studentId, user.id),
                inArray(submissions.assignmentId, assignmentIds),
              ),
            })
          : []

      assignmentData = {
        totalAssignments: courseAssignments.length,
        submittedCount: studentSubmissions.filter(
          (s) => s.status === 'submitted',
        ).length,
        gradedCount: studentSubmissions.filter((s) => s.status === 'graded')
          .length,
      }
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
      assignmentData,
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
  const { course: c, role, completedLessonIds, assignmentData } = loaderData
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
  const totalLessons = course?.lessons.length || 0

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
                  <Button
                    variant="ghost"
                    theme="light"
                    size="icon"
                    className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
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
                  </Button>
                  <Button
                    variant="ghost"
                    theme="light"
                    size="icon"
                    className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-red-300 hover:text-red-600"
                    onClick={() => setShowDeleteCourseDialog(true)}
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
              {course?.thumbnailUrl && (
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
                {course?.description ? (
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
                      {assignmentData.submittedCount +
                        assignmentData.gradedCount}
                    </span>
                    <span className="text-[0.68rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
                      of {assignmentData.totalAssignments} assignment
                      {assignmentData.totalAssignments !== 1 ? 's' : ''}{' '}
                      submitted
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
              {canEdit && course && course.lessons.length < 3 && (
                <Button theme="dark" onClick={() => openLessonDialog('create')}>
                  <PlusIcon className="size-3.5" />
                  Add Lesson
                </Button>
              )}
            </div>

            {/* Lesson list */}
            {course?.lessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpenIcon className="mb-4 size-10 text-[#C5A059]/30" />
                <p className="text-sm text-[#AFA28F]">No lessons yet</p>
                {canEdit && (
                  <Button
                    theme="dark"
                    className="mt-4"
                    onClick={() => openLessonDialog('create')}
                  >
                    <PlusIcon className="size-3.5" />
                    Create First Lesson
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/8">
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
                          {canEdit && (
                            <span
                              className={cn(
                                'border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase',
                                isPublished
                                  ? 'border-[#C5A059]/40 text-[#9B7A41]'
                                  : 'border-white/12 text-[#8E816D]',
                              )}
                            >
                              {isPublished ? 'Published' : 'Draft'}
                            </span>
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
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              theme="dark"
                              size="icon"
                              className="size-7 border border-white/10 text-[#8E816D] hover:border-[#C5A059]/40 hover:text-[#D4B373]"
                              onClick={() => openLessonDialog('edit', lesson)}
                            >
                              <PencilIcon className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              theme="dark"
                              size="icon"
                              className="size-7 border border-white/10 text-[#8E816D] hover:border-red-400/50 hover:text-red-400"
                              onClick={() => openLessonDialog('delete', lesson)}
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
          className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          showCloseButton={false}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
          <div className="relative">
            <DialogHeader>
              <div className="mb-1">
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Confirm action
                </div>
              </div>
              <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
                Delete Course
              </DialogTitle>
              <DialogDescription className="text-[#AFA28F]">
                Are you sure you want to delete "{course?.title}"? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
              <Button
                variant="outline"
                theme="dark"
                onClick={() => setShowDeleteCourseDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-none"
                onClick={() => {
                  if (course) {
                    deleteCourseMutation.mutate({
                      data: { courseId: course.id },
                    })
                  }
                }}
                disabled={deleteCourseMutation.status === 'pending'}
              >
                {deleteCourseMutation.status === 'pending'
                  ? 'Deleting...'
                  : 'Delete'}
              </Button>
            </DialogFooter>
          </div>
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
