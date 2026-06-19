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
import { useAppForm, withForm } from '@/hooks/form'
import { useAllTeachers } from '@/hooks/useAllTeachers'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useFileUpload } from '@/hooks/useFileUpload'
import { createCourse, updateCourse } from '@/utils/courses'
import { uploadCourseThumbnailFn } from '@/utils/imageUpload'
import { getTeacherName } from '@/utils/teachers/domain/teachers.domain'
import {
  buildCourseSubmitAction,
  extractCreatedCourseId,
  getCourseDialogChrome,
  getCourseLoadingLabel,
  getInitialValues,
  isCourseDialogSubmitting,
  shouldLoadCourseTeachers,
  type CourseInitialData,
} from './domain/course-dialog.domain'

type CourseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  isAdmin: boolean
  initialData?: CourseInitialData
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
        <p className="text-xs text-[#8E816D]">
          JPG, PNG, WebP or GIF. Max 2MB.
        </p>
      </div>
    </Field>
  )
}

type CourseFormFieldsExtraProps = {
  teachers: Array<{ id: string; fullName: string }>
  isAdmin: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  fileData: string | null
  thumbnailUrl: string | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearThumbnail: () => void
  mode: 'create' | 'edit'
}

const CourseFormFieldsContent = withForm({
  defaultValues: getInitialValues(undefined),
  props: {} as CourseFormFieldsExtraProps,
  render: ({
    form,
    teachers,
    isAdmin,
    fileInputRef,
    fileData,
    thumbnailUrl,
    onFileChange,
    onClearThumbnail,
    mode,
  }) => (
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
                  renderValue={(value) => getTeacherName(value, teachers)}
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
                  renderValue={(value) => getTeacherName(value, teachers)}
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
          onFileChange={onFileChange}
          onClear={onClearThumbnail}
        />
      </div>

      {mode === 'edit' && (
        <form.AppField name="isPublished">
          {(field) => (
            <field.SwitchField id="course-published" label="Publish course" />
          )}
        </form.AppField>
      )}
    </FieldGroup>
  ),
})

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

  const { teachers, error: teachersError } = useAllTeachers(
    shouldLoadCourseTeachers(open, isAdmin),
  )

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
      const courseId = extractCreatedCourseId(_data)
      if (courseId) {
        await handleThumbnailUpload(courseId)
        clearFile()
        setThumbnailUrl(null)
        onOpenChange(false)
      }
    },
  })

  const form = useAppForm({
    defaultValues: getInitialValues(initialData),
    onSubmit: ({ value }) => {
      const action = buildCourseSubmitAction(
        mode,
        value,
        initialData,
        thumbnailUrl,
      )
      if (action.kind === 'create') {
        createMutation.mutate({ data: action.data })
        return
      }
      if (action.kind === 'update') {
        updateMutation.mutate({ data: action.data })
      }
    },
  })

  useEffect(() => {
    if (!open) return
    setThumbnailUrl(initialData?.thumbnailUrl ?? null)
    if (mode === 'create') clearFile()
    form.reset(getInitialValues(initialData))
  }, [open, initialData, mode, form, clearFile])

  const chrome = getCourseDialogChrome(mode)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={chrome.title}
      subtitle={chrome.subtitle}
      maxWidth="3xl"
      onSubmit={() => void form.handleSubmit()}
      isSubmitting={isCourseDialogSubmitting(isAnyPending, isUploading)}
      submitLabel={chrome.submitLabel}
      loadingLabel={getCourseLoadingLabel(isUploading)}
    >
      <DialogBody>
        <CourseFormFieldsContent
          form={form}
          teachers={teachers}
          isAdmin={isAdmin}
          fileInputRef={fileInputRef}
          fileData={fileData}
          thumbnailUrl={thumbnailUrl}
          onFileChange={handleFileChange}
          onClearThumbnail={() => {
            setThumbnailUrl(null)
            clearFile()
          }}
          mode={mode}
        />
      </DialogBody>
    </FormDialog>
  )
}
