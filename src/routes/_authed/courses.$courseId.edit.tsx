import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { eq } from 'drizzle-orm'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { db } from '@/db'
import { courses } from '@/db/schema'
import { useMutation } from '@/hooks/useMutation'
import {
  createLesson,
  deleteCourse,
  deleteLesson,
  updateCourse,
  updateLesson,
} from '@/utils/courses'
import { getCurrentUser } from '@/utils/auth'

const getCourseForEdit = createServerFn({ method: 'GET' })
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data }) => {
    const { requireTeacherOfCourse } = await import('@/utils/auth')
    const user = await getCurrentUser()

    await requireTeacherOfCourse(user.id, data.courseId)

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
      with: {
        lessons: {
          orderBy: (lessons, { asc }) => [asc(lessons.orderIndex)],
        },
      },
    })

    if (!course) {
      throw new Error('Course not found')
    }

    return { course }
  })

export const Route = createFileRoute('/_authed/courses/$courseId/edit')({
  loader: async ({ params }) => {
    const data = await getCourseForEdit({ data: { courseId: params.courseId } })
    return data
  },
  component: EditCourseComponent,
})

function EditCourseComponent() {
  const { course } = Route.useLoaderData()
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null)

  const updateCourseMutation = useMutation({
    fn: updateCourse,
    onSuccess: async () => {
      await router.invalidate()
    },
  })

  const deleteCourseMutation = useMutation({
    fn: deleteCourse,
    onSuccess: async () => {
      await router.navigate({ to: '/dashboard' })
    },
  })

  const createLessonMutation = useMutation({
    fn: createLesson,
    onSuccess: async () => {
      await router.invalidate()
    },
  })

  const updateLessonMutation = useMutation({
    fn: updateLesson,
    onSuccess: async () => {
      await router.invalidate()
    },
  })

  const deleteLessonMutation = useMutation({
    fn: deleteLesson,
    onSuccess: async () => {
      await router.invalidate()
      setLessonToDelete(null)
    },
  })

  const handleCourseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    updateCourseMutation.mutate({
      data: {
        courseId: course.id,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        thumbnailUrl: formData.get('thumbnailUrl') as string,
        isPublished: formData.get('isPublished') === 'on',
      },
    })
  }

  const handleAddLesson = () => {
    createLessonMutation.mutate({
      data: {
        courseId: course.id,
        title: 'New Lesson',
        orderIndex: course.lessons.length,
      },
    })
  }

  const handleDeleteCourse = () => {
    deleteCourseMutation.mutate({
      data: { courseId: course.id },
    })
  }

  const handleDeleteLesson = (lessonId: string) => {
    deleteLessonMutation.mutate({
      data: { lessonId, courseId: course.id },
    })
  }

  const lessonCount = course.lessons.length

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Course</h1>
        <p className="text-muted-foreground mt-1">
          Manage course details and lessons
        </p>
      </div>

      {lessonCount !== 3 && (
        <Alert className="mb-6">
          <AlertDescription>
            ⚠️ This course should have exactly 3 lessons. Currently has{' '}
            {lessonCount}.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
            <CardDescription>
              Update the basic details of your course
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCourseSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="title">Course Title</FieldLabel>
                  <Input
                    id="title"
                    name="title"
                    type="text"
                    defaultValue={course.title}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={course.description || ''}
                    rows={4}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="thumbnailUrl">Thumbnail URL</FieldLabel>
                  <Input
                    id="thumbnailUrl"
                    name="thumbnailUrl"
                    type="url"
                    defaultValue={course.thumbnailUrl || ''}
                  />
                </Field>
                <Field>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isPublished"
                      name="isPublished"
                      defaultChecked={course.isPublished || false}
                    />
                    <FieldLabel htmlFor="isPublished">
                      Publish course
                    </FieldLabel>
                  </div>
                </Field>
                <Field>
                  <Button
                    type="submit"
                    disabled={updateCourseMutation.status === 'pending'}
                  >
                    {updateCourseMutation.status === 'pending'
                      ? 'Saving...'
                      : 'Save Changes'}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lessons</CardTitle>
                <CardDescription>
                  Manage the 3 lessons for this course
                </CardDescription>
              </div>
              <Button
                onClick={handleAddLesson}
                disabled={createLessonMutation.status === 'pending'}
              >
                <PlusIcon className="size-4" />
                Add Lesson
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {course.lessons.map((lesson, index) => (
                <LessonEditor
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  courseId={course.id}
                  onUpdate={updateLessonMutation.mutate}
                  onDelete={() => setLessonToDelete(lesson.id)}
                  isUpdating={updateLessonMutation.status === 'pending'}
                />
              ))}
              {course.lessons.length === 0 && (
                <div className="text-muted-foreground py-8 text-center">
                  No lessons yet. Add your first lesson to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete this course and all its lessons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <TrashIcon className="size-4" />
              Delete Course
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCourse}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={lessonToDelete !== null}
        onOpenChange={(open) => !open && setLessonToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lesson?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                lessonToDelete && handleDeleteLesson(lessonToDelete)
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type LessonEditorProps = {
  lesson: {
    id: string
    title: string
    content: string | null
    videoUrl: string | null
    scheduledTime: Date | null
    duration: number | null
    orderIndex: number
  }
  index: number
  courseId: string
  onUpdate: (params: { data: unknown }) => void
  onDelete: () => void
  isUpdating: boolean
}

function LessonEditor({
  lesson,
  index,
  courseId,
  onUpdate,
  onDelete,
  isUpdating,
}: LessonEditorProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    const scheduledTimeStr = formData.get('scheduledTime') as string
    const durationStr = formData.get('duration') as string

    onUpdate({
      data: {
        lessonId: lesson.id,
        courseId,
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        videoUrl: formData.get('videoUrl') as string,
        scheduledTime: scheduledTimeStr
          ? new Date(scheduledTimeStr)
          : undefined,
        duration: durationStr ? parseInt(durationStr, 10) : undefined,
        orderIndex: lesson.orderIndex,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Lesson {index + 1}</Badge>
            <CardTitle className="text-lg">{lesson.title}</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <TrashIcon className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`title-${lesson.id}`}>Title</FieldLabel>
              <Input
                id={`title-${lesson.id}`}
                name="title"
                type="text"
                defaultValue={lesson.title}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`content-${lesson.id}`}>Content</FieldLabel>
              <Textarea
                id={`content-${lesson.id}`}
                name="content"
                defaultValue={lesson.content || ''}
                rows={3}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`videoUrl-${lesson.id}`}>
                  Video URL
                </FieldLabel>
                <Input
                  id={`videoUrl-${lesson.id}`}
                  name="videoUrl"
                  type="url"
                  defaultValue={lesson.videoUrl || ''}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`duration-${lesson.id}`}>
                  Duration (minutes)
                </FieldLabel>
                <Input
                  id={`duration-${lesson.id}`}
                  name="duration"
                  type="number"
                  defaultValue={lesson.duration || ''}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`scheduledTime-${lesson.id}`}>
                Scheduled Time
              </FieldLabel>
              <Input
                id={`scheduledTime-${lesson.id}`}
                name="scheduledTime"
                type="datetime-local"
                defaultValue={
                  lesson.scheduledTime
                    ? new Date(lesson.scheduledTime).toISOString().slice(0, 16)
                    : ''
                }
              />
            </Field>
            <Field>
              <Button type="submit" size="sm" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Lesson'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
