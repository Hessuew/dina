import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { useRouter } from '@tanstack/react-router'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { toUserError } from '@/utils/errors'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { DialogBody } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createCourseSchema, updateCourseSchema } from '@/schemas/course.schema'
import { useMutation } from '@/hooks/useMutation'
import { useAllTeachers } from '@/hooks/useAllTeachers'
import { createCourse, updateCourse } from '@/utils/courses'
import { fileToBase64, uploadCourseThumbnailFn } from '@/utils/imageUpload'

type CourseFormData = {
  title: string
  description: string
  thumbnailUrl: string | null
  thumbnailFile: File | null
  teacher1Id: string | null
  teacher2Id: string | null
  orderIndex: number
  isPublished: boolean
}

type CourseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  isAdmin: boolean
  initialData?: {
    courseId: string
    title: string
    description: string
    thumbnailUrl: string | null
    isPublished: boolean
    teacher1Id: string | null
    teacher2Id: string | null
    orderIndex: number
  }
}

const emptyFormData: CourseFormData = {
  title: '',
  description: '',
  thumbnailUrl: null,
  thumbnailFile: null,
  teacher1Id: null,
  teacher2Id: null,
  orderIndex: 0,
  isPublished: false,
}

export function CourseDialog({
  open,
  onOpenChange,
  mode,
  isAdmin,
  initialData,
}: CourseDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<CourseFormData>({ ...emptyFormData })

  useEffect(() => {
    if (open) {
      setFieldErrors({})
      setFormData(
        initialData
          ? {
              title: initialData.title,
              description: initialData.description,
              thumbnailUrl: initialData.thumbnailUrl,
              thumbnailFile: null,
              teacher1Id: initialData.teacher1Id,
              teacher2Id: initialData.teacher2Id,
              orderIndex: initialData.orderIndex,
              isPublished: initialData.isPublished,
            }
          : { ...emptyFormData },
      )
    }
  }, [open, initialData])

  const { teachers, error: teachersError } = useAllTeachers(open && isAdmin)

  if (teachersError) {
    console.error('Failed to load teachers:', teachersError)
  }

  const resetForm = () => {
    setFormData(
      initialData
        ? {
            title: initialData.title,
            description: initialData.description,
            thumbnailUrl: initialData.thumbnailUrl,
            thumbnailFile: null,
            teacher1Id: initialData.teacher1Id,
            teacher2Id: initialData.teacher2Id,
            orderIndex: initialData.orderIndex,
            isPublished: initialData.isPublished,
          }
        : { ...emptyFormData },
    )
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleThumbnailUpload = async (courseId: string) => {
    if (!formData.thumbnailFile) return
    setIsUploading(true)
    try {
      await uploadCourseThumbnailFn({
        data: {
          fileData: await fileToBase64(formData.thumbnailFile),
          fileName: formData.thumbnailFile.name,
          fileType: formData.thumbnailFile.type,
          fileSize: formData.thumbnailFile.size,
          courseId,
        },
      })
    } catch (error) {
      console.error('Thumbnail upload error:', error)
      toast.error(toUserError(error).message)
    }
    setIsUploading(false)
  }

  const createMutation = useMutation({
    fn: createCourse,
    onSuccess: async (ctx) => {
      if ('course' in ctx.data) {
        await handleThumbnailUpload(ctx.data.course.id)
        toast.success('Course created successfully!')
        onOpenChange(false)
        resetForm()
        await router.invalidate()
      }
    },
  })

  const updateMutation = useMutation({
    fn: updateCourse,
    onSuccess: async (ctx) => {
      if ('course' in ctx.data) {
        await handleThumbnailUpload(ctx.data.course.id)
        toast.success('Course updated successfully!')
        onOpenChange(false)
        resetForm()
        await router.invalidate()
      }
    },
  })

  const mutation = mode === 'create' ? createMutation : updateMutation
  const isPending = mutation.status === 'pending' || isUploading

  const handleSubmit = () => {
    const clientSchema =
      mode === 'create'
        ? createCourseSchema
        : updateCourseSchema.extend({
            courseId: z.string().default(initialData?.courseId ?? ''),
          })

    const parseResult = clientSchema.safeParse({
      title: formData.title,
      description: formData.description,
      teacher1Id: formData.teacher1Id ?? undefined,
      teacher2Id: formData.teacher2Id ?? undefined,
      orderIndex: formData.orderIndex,
      courseId: initialData?.courseId ?? '',
      isPublished: formData.isPublished,
    })

    if (!parseResult.success) {
      const errors: Record<string, string> = {}
      for (const issue of parseResult.error.issues) {
        const key = issue.path[0] as string
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    if (isAdmin && formData.teacher1Id && formData.teacher2Id) {
      if (formData.teacher1Id === formData.teacher2Id) {
        setFieldErrors({ teacher2Id: 'Please select 2 different teachers' })
        return
      }
    }

    setFieldErrors({})

    if (mode === 'create') {
      createMutation.mutate({
        data: {
          title: formData.title,
          description: formData.description,
          teacher1Id: formData.teacher1Id ?? undefined,
          teacher2Id: formData.teacher2Id ?? undefined,
          orderIndex: formData.orderIndex,
        },
      })
    } else if (initialData) {
      updateMutation.mutate({
        data: {
          courseId: initialData.courseId,
          title: formData.title,
          description: formData.description,
          isPublished: formData.isPublished,
          teacher1Id: formData.teacher1Id || undefined,
          teacher2Id: formData.teacher2Id || undefined,
          thumbnailUrl: formData.thumbnailUrl || undefined,
          orderIndex: formData.orderIndex,
        },
      })
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }
    const fileData = await fileToBase64(file)
    setFormData({ ...formData, thumbnailUrl: fileData, thumbnailFile: file })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={mode === 'create' ? 'Create Course' : 'Edit Course'}
      subtitle={
        mode === 'create'
          ? 'Add a new course and assign teachers'
          : 'Update the course information'
      }
      maxWidth="3xl"
      onSubmit={handleSubmit}
      isSubmitting={isPending || isUploading}
      submitLabel={mode === 'create' ? 'Create Course' : 'Save Changes'}
      loadingLabel={isUploading ? 'Uploading...' : undefined}
    >
      <DialogBody>
            <FieldGroup className="mt-6 gap-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field className="sm:col-span-2">
                  <FieldLabel
                    htmlFor="course-title"
                    className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                  >
                    Title <span className="text-[#C5A059]">*</span>
                  </FieldLabel>
                  <Input
                    id="course-title"
                    placeholder="Introduction to Programming"
                    value={formData.title}
                    className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50${fieldErrors.title ? 'border-red-500/60' : ''}`}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value })
                      if (fieldErrors.title)
                        setFieldErrors({ ...fieldErrors, title: '' })
                    }}
                  />
                  {fieldErrors.title && (
                    <p className="text-[0.68rem] text-red-400">
                      {fieldErrors.title}
                    </p>
                  )}
                </Field>
                <div className="sm:col-span-1" />
                <Field>
                  <FieldLabel
                    htmlFor="course-orderIndex"
                    className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                  >
                    Order Index
                  </FieldLabel>
                  <Input
                    id="course-orderIndex"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.orderIndex === 0 ? '' : formData.orderIndex}
                    className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        orderIndex:
                          e.target.value === ''
                            ? 0
                            : parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-[#8E816D]">
                    Lower numbers appear first in course list
                  </p>
                </Field>
                {isAdmin && (
                  <>
                    <Field>
                      <FieldLabel
                        htmlFor="course-teacher1"
                        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                      >
                        Teacher 1
                      </FieldLabel>
                      <Select
                        value={formData.teacher1Id ?? undefined}
                        onValueChange={(value) => {
                          setFormData({ ...formData, teacher1Id: value })
                          if (fieldErrors.teacher1Id)
                            setFieldErrors({ ...fieldErrors, teacher1Id: '' })
                        }}
                      >
                        <SelectTrigger
                          className="w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]"
                          id="course-teacher1"
                        >
                          <SelectValue placeholder="Select first teacher">
                            {formData.teacher1Id
                              ? teachers.find(
                                  (t) => t.id === formData.teacher1Id,
                                )?.fullName || 'Select first teacher'
                              : 'Select first teacher'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-white/12 bg-[#1C1A17]">
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
                      {fieldErrors.teacher1Id && (
                        <p className="text-[0.68rem] text-red-400">
                          {fieldErrors.teacher1Id}
                        </p>
                      )}
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor="course-teacher2"
                        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                      >
                        Teacher 2
                      </FieldLabel>
                      <Select
                        value={formData.teacher2Id ?? undefined}
                        onValueChange={(value) => {
                          setFormData({ ...formData, teacher2Id: value })
                          if (fieldErrors.teacher2Id)
                            setFieldErrors({ ...fieldErrors, teacher2Id: '' })
                        }}
                      >
                        <SelectTrigger
                          className="w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]"
                          id="course-teacher2"
                        >
                          <SelectValue placeholder="Select second teacher">
                            {formData.teacher2Id
                              ? teachers.find(
                                  (t) => t.id === formData.teacher2Id,
                                )?.fullName || 'Select second teacher'
                              : 'Select second teacher'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="rounded-none border-white/12 bg-[#1C1A17]">
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
                      {fieldErrors.teacher2Id && (
                        <p className="text-[0.68rem] text-red-400">
                          {fieldErrors.teacher2Id}
                        </p>
                      )}
                    </Field>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="course-description"
                    className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                  >
                    Description
                  </FieldLabel>
                  <Textarea
                    id="course-description"
                    placeholder="Describe what students will learn in this course"
                    rows={10}
                    value={formData.description}
                    className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50${fieldErrors.description ? 'border-red-500/60' : ''}`}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value })
                      if (fieldErrors.description)
                        setFieldErrors({ ...fieldErrors, description: '' })
                    }}
                  />
                  {fieldErrors.description && (
                    <p className="text-[0.68rem] text-red-400">
                      {fieldErrors.description}
                    </p>
                  )}
                </Field>
                <Field>
                  <FieldLabel className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                    Course Thumbnail
                  </FieldLabel>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {formData.thumbnailUrl ? (
                      <div className="relative aspect-video w-full max-w-sm overflow-hidden border border-white/10">
                        <img
                          src={formData.thumbnailUrl}
                          alt="Course thumbnail"
                          className="size-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 rounded-none border-white/20 bg-black/40 text-white hover:bg-black/60"
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
                        theme="dark"
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full max-w-sm rounded-none border-white/12 bg-white/6 text-[#AFA28F] hover:border-[#C5A059]/40 hover:bg-white/10"
                      >
                        <UploadIcon className="mr-2 size-4" />
                        Upload Thumbnail
                      </Button>
                    )}
                    <p className="text-xs text-[#8E816D]">
                      JPG, PNG, WebP or GIF. Max 2MB.
                    </p>
                  </div>
                </Field>
              </div>

              {mode === 'edit' && (
                <Field>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="course-published"
                      checked={formData.isPublished}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isPublished: checked })
                      }
                    />
                    <FieldLabel
                      htmlFor="course-published"
                      className="text-sm text-[#AFA28F]"
                    >
                      Publish course
                    </FieldLabel>
                  </div>
                </Field>
              )}
            </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
