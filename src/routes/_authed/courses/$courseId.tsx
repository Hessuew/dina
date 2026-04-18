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
import { and, eq } from 'drizzle-orm'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { db } from '@/db'
import { courses, lessonProgress, profiles } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'
import { useMutation } from '@/hooks/useMutation'
import { TeacherAvatars } from '@/components/avarats/TeacherAvatars'
import {
  createLesson,
  deleteCourse,
  deleteLesson,
  updateLesson,
} from '@/utils/courses'
import { CourseDialog } from '@/components/dialog/CourseDialog'

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
  const [showCreateLessonDialog, setShowCreateLessonDialog] = useState(false)
  const [showEditLessonDialog, setShowEditLessonDialog] = useState(false)
  const [showDeleteLessonDialog, setShowDeleteLessonDialog] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const isAdmin = role === 'admin'

  const courseTeachersData = course?.courseTeachers || []

  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    content: '',
    scheduledTime: '',
    duration: '',
    isPublished: false,
  })

  const canEdit = role === 'teacher' || role === 'admin'
  const completedCount = completedLessonIds.length
  const totalLessons = course?.lessons.length || 0
  const progress = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0

  const deleteCourseMutation = useMutation({
    fn: deleteCourse,
    onSuccess: async () => {
      toast.success('Course deleted successfully!')
      await router.navigate({
        to: '/dashboard',
      })
    },
  })

  const createLessonMutation = useMutation({
    fn: createLesson,
    onSuccess: async () => {
      toast.success('Lesson created successfully!')
      setShowCreateLessonDialog(false)
      setLessonFormData({
        title: '',
        content: '',
        scheduledTime: '',
        duration: '',
        isPublished: false,
      })
      await router.invalidate()
    },
  })

  const updateLessonMutation = useMutation({
    fn: updateLesson,
    onSuccess: async () => {
      toast.success('Lesson updated successfully!')
      setShowEditLessonDialog(false)
      setSelectedLesson(null)
      await router.invalidate()
    },
  })

  const deleteLessonMutation = useMutation({
    fn: deleteLesson,
    onSuccess: async () => {
      toast.success('Lesson deleted successfully!')
      setShowDeleteLessonDialog(false)
      setSelectedLesson(null)
      await router.invalidate()
    },
  })

  const handleCreateLesson = () => {
    if (!course) return

    if (!lessonFormData.title || !lessonFormData.scheduledTime) {
      toast.error('Title and scheduled time are required')
      return
    }

    if (course.lessons.length >= 3) {
      toast.error('Maximum 3 lessons allowed per course')
      return
    }

    createLessonMutation.mutate({
      data: {
        courseId: course.id,
        title: lessonFormData.title,
        content: lessonFormData.content || undefined,
        scheduledTime: new Date(lessonFormData.scheduledTime),
        duration: lessonFormData.duration
          ? parseInt(lessonFormData.duration)
          : undefined,
        orderIndex: course.lessons.length,
        isPublished: lessonFormData.isPublished,
      },
    })
  }

  const handleUpdateLesson = () => {
    if (!selectedLesson || !course) return

    if (!lessonFormData.title || !lessonFormData.scheduledTime) {
      toast.error('Title and scheduled time are required')
      return
    }

    updateLessonMutation.mutate({
      data: {
        lessonId: selectedLesson.id,
        courseId: course.id,
        title: lessonFormData.title,
        content: lessonFormData.content || undefined,
        scheduledTime: new Date(lessonFormData.scheduledTime),
        duration: lessonFormData.duration
          ? parseInt(lessonFormData.duration)
          : undefined,
        isPublished: lessonFormData.isPublished,
      },
    })
  }

  const openEditLessonDialog = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setLessonFormData({
      title: lesson.title,
      content: lesson.content || '',
      scheduledTime: lesson.scheduledTime
        ? new Date(lesson.scheduledTime).toISOString().slice(0, 16)
        : '',
      duration: lesson.duration?.toString() || '',
      isPublished: lesson.isPublished ?? false,
    })
    setShowEditLessonDialog(true)
  }

  const openDeleteLessonDialog = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setShowDeleteLessonDialog(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              router.navigate({
                to: '/dashboard',
              })
            }
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{course?.title}</h1>
              {course?.courseTeachers && course.courseTeachers.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    Teachers:
                  </span>
                  <TeacherAvatars
                    teachers={course.courseTeachers.map((ct) => ct.teacher)}
                    size="sm"
                    showTooltip={true}
                  />
                </div>
              )}
            </div>
            {canEdit && (
              <Badge variant={course?.isPublished ? 'default' : 'secondary'}>
                {course?.isPublished ? 'Published' : 'Draft'}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>Course Information</CardTitle>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
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
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        className="hover:bg-destructive/10 hover:text-destructive"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteCourseDialog(true)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {course?.thumbnailUrl && (
                  <div className="aspect-video w-full overflow-hidden rounded-lg">
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="size-full object-cover"
                    />
                  </div>
                )}
                {course?.description && (
                  <div>
                    <h3 className="mb-2 font-semibold">Description</h3>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                      {course.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {!canEdit && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Completed Lessons</span>
                      <span className="text-muted-foreground">
                        {completedCount}/{totalLessons}
                      </span>
                    </div>
                    <Progress value={progress} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lessons</CardTitle>
                    <CardDescription>
                      {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} in
                      this course
                    </CardDescription>
                  </div>
                  {canEdit && course && course.lessons.length < 3 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setLessonFormData({
                          title: '',
                          content: '',
                          scheduledTime: '',
                          duration: '',
                          isPublished: false,
                        })
                        setShowCreateLessonDialog(true)
                      }}
                    >
                      <PlusIcon className="mr-2 size-4" />
                      Add Lesson
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {course?.lessons.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <p className="mb-4">No lessons yet</p>
                    {canEdit && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLessonFormData({
                            title: '',
                            content: '',
                            scheduledTime: '',
                            duration: '',
                            isPublished: false,
                          })
                          setShowCreateLessonDialog(true)
                        }}
                      >
                        <PlusIcon className="mr-2 size-4" />
                        Create Your First Lesson
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {course?.lessons.map((lesson: any, index: number) => {
                      const isCompleted = completedLessonIds.includes(lesson.id)
                      const isPublished = lesson.isPublished ?? false
                      const showContent = isPublished || canEdit

                      return (
                        <div
                          key={lesson.id}
                          className={`rounded-lg border p-4 ${
                            showContent
                              ? 'hover:bg-muted/50 cursor-pointer transition-colors'
                              : 'opacity-60'
                          }`}
                          onClick={() => {
                            if (showContent) {
                              router.navigate({
                                to: '/lessons/$lessonId',
                                params: { lessonId: lesson.id },
                              })
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">
                                  {index + 1}. {lesson.title}
                                </h4>
                                {canEdit && (
                                  <Badge
                                    variant={
                                      isPublished ? 'default' : 'secondary'
                                    }
                                  >
                                    {isPublished ? 'Published' : 'Draft'}
                                  </Badge>
                                )}
                              </div>
                              {showContent && lesson.content && (
                                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm whitespace-pre-wrap">
                                  {lesson.content}
                                </p>
                              )}
                              {showContent && (
                                <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
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
                            <div className="flex items-center gap-2">
                              {role === 'student' && isPublished && (
                                <div>
                                  {isCompleted ? (
                                    <Badge variant="default">Completed</Badge>
                                  ) : (
                                    <Button size="sm">Start</Button>
                                  )}
                                </div>
                              )}
                              {canEdit && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditLessonDialog(lesson)
                                    }}
                                  >
                                    <PencilIcon className="size-4" />
                                  </Button>
                                  <Button
                                    className="hover:bg-destructive/10 hover:text-destructive"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openDeleteLessonDialog(lesson)
                                    }}
                                  >
                                    <TrashIcon className="size-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteCourseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
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

      {/* Create Lesson Dialog */}
      <Dialog
        open={showCreateLessonDialog}
        onOpenChange={setShowCreateLessonDialog}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Lesson</DialogTitle>
            <DialogDescription>
              Add a new lesson to this course
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="lesson-title">
                  Title <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="lesson-title"
                  placeholder="Lesson title"
                  value={lessonFormData.title}
                  onChange={(e) =>
                    setLessonFormData({
                      ...lessonFormData,
                      title: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lesson-time">
                  Scheduled Time <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="lesson-time"
                  type="datetime-local"
                  value={lessonFormData.scheduledTime}
                  onChange={(e) =>
                    setLessonFormData({
                      ...lessonFormData,
                      scheduledTime: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lesson-duration">
                  Duration (minutes)
                </FieldLabel>
                <Input
                  id="lesson-duration"
                  type="number"
                  placeholder="60"
                  value={lessonFormData.duration}
                  onChange={(e) =>
                    setLessonFormData({
                      ...lessonFormData,
                      duration: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <div className="flex items-center gap-2">
                  <Switch
                    id="lesson-published"
                    checked={lessonFormData.isPublished}
                    onCheckedChange={(checked) =>
                      setLessonFormData({
                        ...lessonFormData,
                        isPublished: checked,
                      })
                    }
                  />
                  <FieldLabel htmlFor="lesson-published">
                    Publish lesson
                  </FieldLabel>
                </div>
              </Field>
            </div>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="lesson-content">Content</FieldLabel>
              <Textarea
                id="lesson-content"
                placeholder="Lesson content or description"
                rows={10}
                value={lessonFormData.content}
                onChange={(e) =>
                  setLessonFormData({
                    ...lessonFormData,
                    content: e.target.value,
                  })
                }
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateLessonDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLesson}
              disabled={createLessonMutation.status === 'pending'}
            >
              {createLessonMutation.status === 'pending'
                ? 'Creating...'
                : 'Create Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Dialog */}
      <Dialog
        open={showEditLessonDialog}
        onOpenChange={setShowEditLessonDialog}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>Update the lesson information</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-lesson-title">
                  Title <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="edit-lesson-title"
                  placeholder="Lesson title"
                  value={lessonFormData.title}
                  onChange={(e) =>
                    setLessonFormData({
                      ...lessonFormData,
                      title: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-lesson-time">
                  Scheduled Time <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="edit-lesson-time"
                  type="datetime-local"
                  value={lessonFormData.scheduledTime}
                  onChange={(e) =>
                    setLessonFormData({
                      ...lessonFormData,
                      scheduledTime: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-lesson-duration">
                  Duration (minutes)
                </FieldLabel>
                <Input
                  id="edit-lesson-duration"
                  type="number"
                  placeholder="60"
                  value={lessonFormData.duration}
                  onChange={(e) =>
                    setLessonFormData({
                      ...lessonFormData,
                      duration: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <div className="flex items-center gap-2">
                  <Switch
                    id="edit-lesson-published"
                    checked={lessonFormData.isPublished}
                    onCheckedChange={(checked) =>
                      setLessonFormData({
                        ...lessonFormData,
                        isPublished: checked,
                      })
                    }
                  />
                  <FieldLabel htmlFor="edit-lesson-published">
                    Publish lesson
                  </FieldLabel>
                </div>
              </Field>
            </div>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="edit-lesson-content">Content</FieldLabel>
              <Textarea
                id="edit-lesson-content"
                placeholder="Lesson content or description"
                rows={10}
                value={lessonFormData.content}
                onChange={(e) =>
                  setLessonFormData({
                    ...lessonFormData,
                    content: e.target.value,
                  })
                }
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditLessonDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLesson}
              disabled={updateLessonMutation.status === 'pending'}
            >
              {updateLessonMutation.status === 'pending'
                ? 'Saving...'
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Dialog */}
      <Dialog
        open={showDeleteLessonDialog}
        onOpenChange={setShowDeleteLessonDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lesson? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteLessonDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedLesson && course) {
                  deleteLessonMutation.mutate({
                    data: {
                      lessonId: selectedLesson.id,
                      courseId: course.id,
                    },
                  })
                }
              }}
              disabled={deleteLessonMutation.status === 'pending'}
            >
              {deleteLessonMutation.status === 'pending'
                ? 'Deleting...'
                : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
