import { useEffect, useState } from 'react'
import { z } from 'zod'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { toUserError } from '@/utils/errors'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/ui/form-dialog'
import { DialogBody } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { SelectItem } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  FormFieldInput,
  FormFieldNumberInput,
  FormFieldSelect,
  FormFieldTextarea,
} from '@/components/ui/form-field'
import { createCourseSchema, updateCourseSchema } from '@/schemas/course.schema'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useAllTeachers } from '@/hooks/useAllTeachers'
import { useFileUpload } from '@/hooks/useFileUpload'
import { createCourse, updateCourse } from '@/utils/courses'
import { uploadCourseThumbnailFn } from '@/utils/imageUpload'

type CourseFormData = {
  title: string
  description: string
  thumbnailUrl: string | null
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
  const {
    fileInputRef,
    isUploading,
    fileData,
    fileObject,
    handleFileChange,
    clearFile,
    setUploading,
  } = useFileUpload()
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
            teacher1Id: initialData.teacher1Id,
            teacher2Id: initialData.teacher2Id,
            orderIndex: initialData.orderIndex,
            isPublished: initialData.isPublished,
          }
        : { ...emptyFormData },
    )
    clearFile()
  }

  const handleThumbnailUpload = async (courseId: string) => {
    if (!fileObject) return
    setUploading(true)
    try {
      await uploadCourseThumbnailFn({
        data: {
          fileData: fileData!,
          fileName: fileObject.name,
          fileType: fileObject.type,
          fileSize: fileObject.size,
          courseId,
        },
      })
    } catch (error) {
      console.error('Thumbnail upload error:', error)
      toast.error(toUserError(error).message)
    }
    setUploading(false)
  }

  const { createMutation, updateMutation, isAnyPending } = useEntityMutation({
    createFn: createCourse,
    updateFn: updateCourse,
    onSuccessMessage: (_mode) =>
      `Course ${_mode === 'create' ? 'created' : 'updated'} successfully!`,
    onSuccess: async ({ mode: _mode, data: _data }) => {
      const data = _data as { course: { id: string } }
      if ('course' in data) {
        await handleThumbnailUpload(data.course.id)
        onOpenChange(false)
        resetForm()
      }
    },
  })

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
      isSubmitting={isAnyPending || isUploading}
      submitLabel={mode === 'create' ? 'Create Course' : 'Save Changes'}
      loadingLabel={isUploading ? 'Uploading...' : undefined}
    >
      <DialogBody>
        <FieldGroup className="mt-6 gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormFieldInput
              id="course-title"
              label="Title"
              required
              className="sm:col-span-2"
              value={formData.title}
              onChange={(value) => {
                setFormData({ ...formData, title: value })
                if (fieldErrors.title)
                  setFieldErrors({ ...fieldErrors, title: '' })
              }}
              error={fieldErrors.title}
              placeholder="Introduction to Programming"
            />
            <div className="sm:col-span-1" />
            <FormFieldNumberInput
              id="course-orderIndex"
              label="Order Index"
              min={0}
              value={formData.orderIndex}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  orderIndex: value,
                })
              }
              description="Lower numbers appear first in course list"
              placeholder="0"
            />
            {isAdmin && (
              <>
                <FormFieldSelect
                  id="course-teacher1"
                  label="Teacher 1"
                  value={formData.teacher1Id ?? ''}
                  onChange={(value) => {
                    setFormData({ ...formData, teacher1Id: value })
                    if (fieldErrors.teacher1Id)
                      setFieldErrors({ ...fieldErrors, teacher1Id: '' })
                  }}
                  error={fieldErrors.teacher1Id}
                  placeholder="Select first teacher"
                >
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
                </FormFieldSelect>
                <FormFieldSelect
                  id="course-teacher2"
                  label="Teacher 2"
                  value={formData.teacher2Id ?? ''}
                  onChange={(value) => {
                    setFormData({ ...formData, teacher2Id: value })
                    if (fieldErrors.teacher2Id)
                      setFieldErrors({ ...fieldErrors, teacher2Id: '' })
                  }}
                  error={fieldErrors.teacher2Id}
                  placeholder="Select second teacher"
                >
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
                </FormFieldSelect>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormFieldTextarea
              id="course-description"
              label="Description"
              value={formData.description}
              onChange={(value) => {
                setFormData({ ...formData, description: value })
                if (fieldErrors.description)
                  setFieldErrors({ ...fieldErrors, description: '' })
              }}
              error={fieldErrors.description}
              placeholder="Describe what students will learn in this course"
              rows={10}
            />
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
                {fileData || formData.thumbnailUrl ? (
                  <div className="relative aspect-video w-full max-w-sm overflow-hidden border border-white/10">
                    <img
                      src={fileData || formData.thumbnailUrl!}
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
                        })
                        clearFile()
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
