import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react'
import { and, eq } from 'drizzle-orm'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { db } from '@/db'
import { courses, enrollments, lessonProgress, profiles } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'
import { useMutation } from '@/hooks/useMutation'
import { useAllTeachers } from '@/hooks/useAllTeachers'
import { TeacherAvatars } from '@/components/TeacherAvatars'
import {
  createLesson,
  deleteCourse,
  deleteLesson,
  updateCourse,
  updateLesson,
} from '@/utils/courses'
import { fileToBase64, uploadImageFn } from '@/utils/imageUpload'

const getCourseData = createServerFn({ method: 'GET' })
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
      with: {
        teacher: true,
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

    let enrollment = null
    let progress: Array<any> = []

    if (profile.role === 'student') {
      enrollment = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.studentId, user.id),
          eq(enrollments.courseId, data.courseId),
        ),
      })

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
      isEnrolled: !!enrollment,
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
  const { course: c, role, isEnrolled, completedLessonIds } = loaderData
  const course = c as typeof loaderData.course | null

  const [showEditCourseDialog, setShowEditCourseDialog] = useState(false)
  const [showDeleteCourseDialog, setShowDeleteCourseDialog] = useState(false)
  const [showCreateLessonDialog, setShowCreateLessonDialog] = useState(false)
  const [showEditLessonDialog, setShowEditLessonDialog] = useState(false)
  const [showDeleteLessonDialog, setShowDeleteLessonDialog] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isAdmin = role === 'admin'

  const { teachers, error: teachersError } = useAllTeachers(
    showEditCourseDialog && isAdmin,
  )

  if (teachersError) {
    console.error('Failed to load teachers:', teachersError)
  }

  const courseTeachersData = course?.courseTeachers || []
  const [courseFormData, setCourseFormData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    thumbnailUrl: course?.thumbnailUrl || null,
    thumbnailFile: null as File | null,
    isPublished: course?.isPublished ?? false,
    teacher1Id: courseTeachersData[0]?.teacher?.id || null,
    teacher2Id: courseTeachersData[1]?.teacher?.id || null,
  })

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

  const updateCourseMutation = useMutation({
    fn: updateCourse,
    onSuccess: async () => {
      if (courseFormData.thumbnailFile) {
        setIsUploading(true)
        try {
          const result = await uploadImageFn({
            data: {
              fileData: await fileToBase64(courseFormData.thumbnailFile),
              fileName: courseFormData.thumbnailFile.name,
              fileType: courseFormData.thumbnailFile.type,
              fileSize: courseFormData.thumbnailFile.size,
              bucket: 'course-thumbnails',
            },
          })

          if (!result.error && result.imageUrl && course) {
            await updateCourse({
              data: {
                courseId: course.id,
                title: courseFormData.title,
                description: courseFormData.description,
                thumbnailUrl: result.imageUrl,
                isPublished: courseFormData.isPublished,
              },
            })
          }
        } catch (error) {
          console.error('Thumbnail upload error:', error)
        }
        setIsUploading(false)
      }

      toast.success('Course updated successfully!')
      setShowEditCourseDialog(false)
      await router.invalidate()
    },
  })

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

  const handleUpdateCourse = () => {
    if (!courseFormData.title) {
      toast.error('Title is required')
      return
    }

    if (!course) return

    if (isAdmin && courseFormData.teacher1Id && courseFormData.teacher2Id) {
      if (courseFormData.teacher1Id === courseFormData.teacher2Id) {
        toast.error('Please select 2 different teachers')
        return
      }
    }

    updateCourseMutation.mutate({
      data: {
        courseId: course.id,
        title: courseFormData.title,
        description: courseFormData.description,
        thumbnailUrl: courseFormData.thumbnailUrl || undefined,
        isPublished: courseFormData.isPublished,
        teacher1Id: courseFormData.teacher1Id || undefined,
        teacher2Id: courseFormData.teacher2Id || undefined,
      },
    })
  }

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.navigate({
                  to: '/dashboard',
                })
              }
              className="mb-2"
            >
              <ArrowLeftIcon className="mr-2 size-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">{course?.title}</h1>
            {course?.courseTeachers && course.courseTeachers.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Teachers:</span>
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
                          if (course)
                            setCourseFormData({
                              title: course.title,
                              description: course.description || '',
                              thumbnailUrl: course.thumbnailUrl,
                              thumbnailFile: null,
                              isPublished: course.isPublished ?? false,
                              teacher1Id: course.teacher1Id,
                              teacher2Id: course.teacher2Id,
                            })
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
                    <p className="text-muted-foreground text-sm">
                      {course.description}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="mb-2 font-semibold">Course Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Lessons
                      </span>
                      <span className="font-medium">{totalLessons}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!canEdit && isEnrolled && (
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
                                <p className="text-muted-foreground mt-1 text-sm line-clamp-2">
                                  {lesson.content}
                                </p>
                              )}
                              {showContent && (
                                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
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
                              {role === 'student' &&
                                isEnrolled &&
                                isPublished && (
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
      <Dialog
        open={showEditCourseDialog}
        onOpenChange={setShowEditCourseDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>Update the course information</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="course-title">
                Title <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="course-title"
                placeholder="Introduction to Programming"
                value={courseFormData.title}
                onChange={(e) =>
                  setCourseFormData({
                    ...courseFormData,
                    title: e.target.value,
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="course-description">Description</FieldLabel>
              <Textarea
                id="course-description"
                placeholder="Describe what students will learn in this course"
                rows={4}
                value={courseFormData.description}
                onChange={(e) =>
                  setCourseFormData({
                    ...courseFormData,
                    description: e.target.value,
                  })
                }
              />
            </Field>
            {isAdmin && (
              <>
                <Field>
                  <FieldLabel htmlFor="edit-teacher1">
                    Teacher 1 <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={
                      courseFormData.teacher1Id
                        ? courseFormData.teacher1Id
                        : undefined
                    }
                    onValueChange={(value) =>
                      setCourseFormData({
                        ...courseFormData,
                        teacher1Id: value,
                      })
                    }
                  >
                    <SelectTrigger id="edit-teacher1">
                      <SelectValue placeholder="Select first teacher">
                        {courseFormData.teacher1Id
                          ? teachers.find(
                              (t) => t.id === courseFormData.teacher1Id,
                            )?.fullName || 'Select first teacher'
                          : 'Select first teacher'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No teachers available
                        </SelectItem>
                      ) : (
                        teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.fullName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-teacher2">
                    Teacher 2 <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={
                      courseFormData.teacher2Id
                        ? courseFormData.teacher2Id
                        : undefined
                    }
                    onValueChange={(value) =>
                      setCourseFormData({
                        ...courseFormData,
                        teacher2Id: value,
                      })
                    }
                  >
                    <SelectTrigger id="edit-teacher2">
                      <SelectValue placeholder="Select second teacher">
                        {courseFormData.teacher2Id
                          ? teachers.find(
                              (t) => t.id === courseFormData.teacher2Id,
                            )?.fullName || 'Select second teacher'
                          : 'Select second teacher'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No teachers available
                        </SelectItem>
                      ) : (
                        teachers
                          .filter((t) => t.id !== courseFormData.teacher1Id)
                          .map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.fullName}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}
            <Field>
              <FieldLabel>Course Thumbnail</FieldLabel>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return

                    if (file.size > 2 * 1024 * 1024) {
                      toast.error('File size must be less than 2MB')
                      return
                    }

                    const fileData = await fileToBase64(file)
                    setCourseFormData({
                      ...courseFormData,
                      thumbnailUrl: fileData,
                      thumbnailFile: file,
                    })
                  }}
                  className="hidden"
                />
                {courseFormData.thumbnailUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <img
                      src={courseFormData.thumbnailUrl}
                      alt="Course thumbnail"
                      className="size-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => {
                        setCourseFormData({
                          ...courseFormData,
                          thumbnailUrl: null,
                          thumbnailFile: null,
                        })
                        if (fileInputRef.current)
                          fileInputRef.current.value = ''
                      }}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <UploadIcon className="mr-2 size-4" />
                    Upload Thumbnail
                  </Button>
                )}
                <p className="text-muted-foreground text-xs">
                  JPG, PNG, WebP or GIF. Max 2MB.
                </p>
              </div>
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  id="course-published"
                  checked={courseFormData.isPublished}
                  onCheckedChange={(checked) =>
                    setCourseFormData({
                      ...courseFormData,
                      isPublished: checked,
                    })
                  }
                />
                <FieldLabel htmlFor="course-published">
                  Publish course
                </FieldLabel>
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditCourseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCourse}
              disabled={
                updateCourseMutation.status === 'pending' || isUploading
              }
            >
              {isUploading
                ? 'Uploading...'
                : updateCourseMutation.status === 'pending'
                  ? 'Saving...'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Lesson</DialogTitle>
            <DialogDescription>
              Add a new lesson to this course
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
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
              <FieldLabel htmlFor="lesson-content">Content</FieldLabel>
              <Textarea
                id="lesson-content"
                placeholder="Lesson content or description"
                rows={3}
                value={lessonFormData.content}
                onChange={(e) =>
                  setLessonFormData({
                    ...lessonFormData,
                    content: e.target.value,
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>Update the lesson information</DialogDescription>
          </DialogHeader>
          <FieldGroup>
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
              <FieldLabel htmlFor="edit-lesson-content">Content</FieldLabel>
              <Textarea
                id="edit-lesson-content"
                placeholder="Lesson content or description"
                rows={3}
                value={lessonFormData.content}
                onChange={(e) =>
                  setLessonFormData({
                    ...lessonFormData,
                    content: e.target.value,
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
