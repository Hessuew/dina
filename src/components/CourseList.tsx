import { useRouter } from '@tanstack/react-router'
import { PlusIcon, UploadIcon, XIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { CourseCardVariant1 } from './CourseCardVariant1'
import type { Assignment } from './AssignmentsView'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@/hooks/useMutation'
import { useAllTeachers } from '@/hooks/useAllTeachers'
import { createCourse } from '@/utils/courses'
import { fileToBase64, uploadImageFn } from '@/utils/imageUpload'
import { UpcomingLessonsList } from '@/components/UpcomingLessonsList'
import { UpcomingAssignmentsList } from '@/components/UpcomingAssignmentsList'

type Course = {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  isPublished: boolean
  lessons: Array<{ id: string }>
  teacher?: {
    fullName: string
  }
  completedLessons?: number
  totalLessons?: number
}

type CourseListProps = {
  courses: Array<Course>
  role: 'student' | 'teacher' | 'admin'
  assignments: Array<Assignment>
  lessons: Array<{
    id: string
    title: string
    scheduledTime: Date
    thumbnailUrl: string | null
    courseId: string
    courseName: string
  }>
}

function CourseListInternal({
  courses,
  role,
}: Omit<CourseListProps, 'assignments' | 'lessons'>) {
  const router = useRouter()
  const isAdmin = role === 'admin'
  const isTeacher = role === 'teacher' || role === 'admin'
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnailUrl: null as string | null,
    thumbnailFile: null as File | null,
    teacher1Id: null as string | null,
    teacher2Id: null as string | null,
  })

  const { teachers, error: teachersError } = useAllTeachers(
    showCreateDialog && isAdmin,
  )

  if (teachersError) {
    console.error('Failed to load teachers:', teachersError)
  }

  const createCourseMutation = useMutation({
    fn: createCourse,
    onSuccess: async (ctx) => {
      if ('course' in ctx.data) {
        const courseId = ctx.data.course.id

        if (formData.thumbnailFile) {
          setIsUploading(true)
          try {
            const result = await uploadImageFn({
              data: {
                fileData: await fileToBase64(formData.thumbnailFile),
                fileName: formData.thumbnailFile.name,
                fileType: formData.thumbnailFile.type,
                fileSize: formData.thumbnailFile.size,
                bucket: 'course-thumbnails',
              },
            })

            if (!result.error && result.imageUrl) {
              await fetch('/api/courses/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  courseId,
                  thumbnailUrl: result.imageUrl,
                }),
              })
            }
          } catch (error) {
            console.error('Thumbnail upload error:', error)
          }
          setIsUploading(false)
        }

        toast.success('Course created successfully!')
        setShowCreateDialog(false)
        setFormData({
          title: '',
          description: '',
          thumbnailUrl: null,
          thumbnailFile: null,
          teacher1Id: '',
          teacher2Id: '',
        })
        await router.invalidate()
      }
    },
  })

  const handleCreateCourse = () => {
    if (!formData.title) {
      toast.error('Title is required')
      return
    }

    if (isAdmin) {
      if (!formData.teacher1Id || !formData.teacher2Id) {
        toast.error('Please select 2 teachers for this course')
        return
      }

      if (formData.teacher1Id === formData.teacher2Id) {
        toast.error('Please select 2 different teachers')
        return
      }
    }

    createCourseMutation.mutate({
      data: {
        title: formData.title,
        description: formData.description,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        teacher1Id: formData.teacher1Id as string,
        teacher2Id: formData.teacher2Id as string,
      },
    })
  }

  function teacherDialog() {
    if (!isAdmin) return null

    return (
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Course</DialogTitle>
            <DialogDescription>
              Add a new course and assign 2 teachers
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">
                Title <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="title"
                placeholder="Introduction to Programming"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                placeholder="Describe what students will learn in this course"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="teacher1">
                Teacher 1 <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={formData.teacher1Id ? formData.teacher1Id : undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, teacher1Id: value })
                }
              >
                <SelectTrigger id="teacher1">
                  <SelectValue placeholder="Select first teacher">
                    {formData.teacher1Id
                      ? teachers.find((t) => t.id === formData.teacher1Id)
                          ?.fullName || 'Select first teacher'
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
              <FieldLabel htmlFor="teacher2">
                Teacher 2 <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={formData.teacher2Id ? formData.teacher2Id : undefined}
                onValueChange={(value) =>
                  setFormData({ ...formData, teacher2Id: value })
                }
              >
                <SelectTrigger id="teacher2">
                  <SelectValue placeholder="Select second teacher">
                    {formData.teacher2Id
                      ? teachers.find((t) => t.id === formData.teacher2Id)
                          ?.fullName || 'Select second teacher'
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
                      .filter((t) => t.id !== formData.teacher1Id)
                      .map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.fullName}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </Field>
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
                    setFormData({
                      ...formData,
                      thumbnailUrl: fileData,
                      thumbnailFile: file,
                    })
                  }}
                  className="hidden"
                />
                {formData.thumbnailUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                    <img
                      src={formData.thumbnailUrl}
                      alt="Course thumbnail"
                      className="size-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => {
                        setFormData({
                          ...formData,
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
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCourse}
              disabled={
                createCourseMutation.status === 'pending' || isUploading
              }
            >
              {isUploading
                ? 'Uploading...'
                : createCourseMutation.status === 'pending'
                  ? 'Creating...'
                  : 'Create Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (courses.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">
            {isTeacher ? 'No courses yet' : 'No enrolled courses'}
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            {isTeacher
              ? 'Create your first course to get started'
              : 'You are not enrolled in any courses yet'}
          </p>
          {isAdmin && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <PlusIcon className="size-4" />
              Create Course
            </Button>
          )}
        </div>

        {teacherDialog()}
      </>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {isTeacher && (
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateDialog(true)}>
              <PlusIcon className="size-4" />
              Create Course
            </Button>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCardVariant1
              key={course.id}
              course={course as any}
              role={role}
            />
          ))}
        </div>
      </div>

      {teacherDialog()}
    </>
  )
}

export function CourseList({
  courses,
  role,
  assignments,
  lessons,
}: CourseListProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <CourseListInternal courses={courses} role={role} />
      </div>

      <div className="space-y-6">
        <UpcomingLessonsList lessons={lessons} />
        <UpcomingAssignmentsList assignments={assignments} role={role} />
      </div>
    </div>
  )
}
