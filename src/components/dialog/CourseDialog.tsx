import { useEffect, useState } from 'react'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { toUserError } from '@/utils/errors'
import { Button } from '@/components/ui/button'
import { DialogBody } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { SelectItem } from '@/components/ui/select'
import { createCourseSchema } from '@/schemas/course.schema'
import { useAppForm } from '@/hooks/form'
import { useAllTeachers } from '@/hooks/useAllTeachers'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useFileUpload } from '@/hooks/useFileUpload'
import { createCourse, updateCourse } from '@/utils/courses'
import { uploadCourseThumbnailFn } from '@/utils/imageUpload'

type CourseFormData = {
  title: string
  description: string
  orderIndex: number
  teacher1Id: string
  teacher2Id: string
  isPublished: boolean
}

const emptyFormData: CourseFormData = {
  title: '',
  description: '',
  orderIndex: 0,
  teacher1Id: '',
  teacher2Id: '',
  isPublished: false,
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

function getInitialValues(
  initialData: CourseDialogProps['initialData'],
): CourseFormData {
  if (!initialData) return { ...emptyFormData }

  return {
    title: initialData.title,
    description: initialData.description,
    orderIndex: initialData.orderIndex,
    teacher1Id: initialData.teacher1Id ?? '',
    teacher2Id: initialData.teacher2Id ?? '',
    isPublished: initialData.isPublished,
  }
}

function TeacherSelectItems({
  teachers,
}: {
  teachers: Array<{ id: string; fullName: string }>
}) {
  if (teachers.length === 0) {
    return (
      <SelectItem value="none" disabled>
        No teachers available
      </SelectItem>
    )
  }
  return (
    <>
      {teachers.map((teacher) => (
        <SelectItem key={teacher.id} value={teacher.id}>
          {teacher.fullName}
        </SelectItem>
      ))}
    </>
  )
}

function ThumbnailUploadField({
  fileInputRef,
  fileData,
  thumbnailUrl,
  onFileChange,
  onClear,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  fileData: string | null
  thumbnailUrl: string | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}) {
  return (
    <Field>
      <FieldLabel className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
        Course Thumbnail
      </FieldLabel>
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFileChange}
          className="hidden"
        />
        {fileData || thumbnailUrl ? (
          <div className="relative aspect-video w-full max-w-sm overflow-hidden border border-white/10">
            <img
              src={fileData || thumbnailUrl!}
              alt="Course thumbnail"
              className="size-full object-cover"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 rounded-none border-white/20 bg-black/40 text-white hover:bg-black/60"
              onClick={onClear}
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
        <p className="text-xs text-[#8E816D]">JPG, PNG, WebP or GIF. Max 2MB.</p>
      </div>
    </Field>
  )
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

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  const { teachers, error: teachersError } = useAllTeachers(open && isAdmin)

  if (teachersError) {
    console.error('Failed to load teachers:', teachersError)
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
    onSuccess: async ({ data: _data }) => {
      const data = _data as { course: { id: string } }
      if ('course' in data) {
        await handleThumbnailUpload(data.course.id)
        clearFile()
        setThumbnailUrl(null)
        onOpenChange(false)
      }
    },
  })

  const form = useAppForm({
    defaultValues: getInitialValues(initialData),
    onSubmit: ({ value }) => {
      const shared = {
        title: value.title,
        description: value.description,
        orderIndex: value.orderIndex,
        teacher1Id: value.teacher1Id || undefined,
        teacher2Id: value.teacher2Id || undefined,
        isPublished: value.isPublished,
      }

      if (mode === 'create') {
        createMutation.mutate({ data: shared })
        return
      }

      if (!initialData) return
      updateMutation.mutate({
        data: {
          ...shared,
          courseId: initialData.courseId,
          thumbnailUrl: thumbnailUrl || undefined,
        },
      })
    },
  })

  useEffect(() => {
    if (!open) return
    setThumbnailUrl(initialData?.thumbnailUrl ?? null)
    if (mode === 'create') clearFile()
    form.reset(getInitialValues(initialData))
  }, [open, initialData, mode, form, clearFile])

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
      onSubmit={() => void form.handleSubmit()}
      isSubmitting={isAnyPending || isUploading}
      submitLabel={mode === 'create' ? 'Create Course' : 'Save Changes'}
      loadingLabel={isUploading ? 'Uploading...' : undefined}
    >
      <DialogBody>
        <FieldGroup className="mt-6 gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <form.AppField
              name="title"
              validators={{ onSubmit: createCourseSchema.shape.title }}
            >
              {(field) => (
                <field.TextField
                  id="course-title"
                  label="Title"
                  required
                  className="sm:col-span-2"
                  placeholder="Introduction to Programming"
                />
              )}
            </form.AppField>
            <div className="sm:col-span-1" />
            <form.AppField name="orderIndex">
              {(field) => (
                <field.NumberField
                  id="course-orderIndex"
                  label="Order Index"
                  min={0}
                  placeholder="0"
                  description="Lower numbers appear first in course list"
                />
              )}
            </form.AppField>
            {isAdmin && (
              <>
                <form.AppField name="teacher1Id">
                  {(field) => (
                    <field.SelectField
                      id="course-teacher1"
                      label="Teacher 1"
                      placeholder="Select first teacher"
                    >
                      <TeacherSelectItems teachers={teachers} />
                    </field.SelectField>
                  )}
                </form.AppField>
                <form.AppField
                  name="teacher2Id"
                  validators={{
                    onSubmit: ({ value, fieldApi }) => {
                      const teacher1Id = fieldApi.form.state.values.teacher1Id
                      if (
                        value !== '' &&
                        teacher1Id !== '' &&
                        value === teacher1Id
                      ) {
                        return 'Please select 2 different teachers'
                      }
                      return undefined
                    },
                  }}
                >
                  {(field) => (
                    <field.SelectField
                      id="course-teacher2"
                      label="Teacher 2"
                      placeholder="Select second teacher"
                    >
                      <TeacherSelectItems
                        teachers={teachers.filter(
                          (t) => t.id !== form.getFieldValue('teacher1Id'),
                        )}
                      />
                    </field.SelectField>
                  )}
                </form.AppField>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.AppField
              name="description"
              validators={{ onSubmit: createCourseSchema.shape.description }}
            >
              {(field) => (
                <field.TextAreaField
                  id="course-description"
                  label="Description"
                  placeholder="Describe what students will learn in this course"
                  rows={10}
                />
              )}
            </form.AppField>
            <ThumbnailUploadField
              fileInputRef={fileInputRef}
              fileData={fileData}
              thumbnailUrl={thumbnailUrl}
              onFileChange={handleFileChange}
              onClear={() => {
                setThumbnailUrl(null)
                clearFile()
              }}
            />
          </div>

          {mode === 'edit' && (
            <form.AppField name="isPublished">
              {(field) => (
                <field.SwitchField
                  id="course-published"
                  label="Publish course"
                />
              )}
            </form.AppField>
          )}
        </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
