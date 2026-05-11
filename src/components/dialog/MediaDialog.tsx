import { useEffect, useState } from 'react'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { MediaLibraryRow } from '@/utils/library/library'
import { createMediaSchema, updateMediaSchema } from '@/schemas/media.schema'
import {
  createLibraryMedia,
  deleteLibraryMedia,
  updateLibraryMedia,
  uploadMediaPdfFn,
} from '@/utils/library/library'
import { toUserError } from '@/utils/errors'
import { useAppForm } from '@/hooks/form'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { DialogBody } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { SelectItem } from '@/components/ui/select'
import { FormFieldSelect } from '@/components/ui/form-field'

type MediaDialogMode = 'create' | 'edit' | 'delete'

type MediaKind = 'youtube' | 'pdf'

type MediaFormData = {
  title: string
  category: string
  description: string
  kind: MediaKind
  url: string
  isPublished: boolean
}

type MediaFieldErrors = Partial<Record<keyof MediaFormData, string>>

type MediaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: MediaDialogMode
  media?: MediaLibraryRow
}

const emptyFormData: MediaFormData = {
  title: '',
  category: '',
  description: '',
  kind: 'youtube',
  url: '',
  isPublished: false,
}

function fromFileType(fileType: MediaLibraryRow['fileType']): MediaKind {
  return fileType === 'document' ? 'pdf' : 'youtube'
}

function getInitialValues(
  media: MediaDialogProps['media'],
  mode: MediaDialogMode,
): MediaFormData {
  if (!media || mode === 'create') return { ...emptyFormData }

  return {
    title: media.title,
    category: media.category,
    description: media.description ?? '',
    kind: fromFileType(media.fileType),
    url: media.fileUrl,
    isPublished: media.isPublished,
  }
}

function extractFieldErrors(
  issues: Array<{ path: Array<PropertyKey>; message: string }>,
): MediaFieldErrors {
  const errors: MediaFieldErrors = {}

  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key !== 'string' || !(key in emptyFormData)) continue

    const field = key as keyof MediaFormData
    if (!errors[field]) errors[field] = issue.message
  }

  return errors
}

export function MediaDialog({
  open,
  onOpenChange,
  mode,
  media,
}: MediaDialogProps) {
  const {
    fileInputRef,
    isUploading,
    fileData,
    fileObject,
    handleFileChange,
    clearFile,
    setUploading,
  } = useFileUpload()

  const [submitErrors, setSubmitErrors] = useState<MediaFieldErrors>({})

  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createLibraryMedia,
      updateFn: updateLibraryMedia,
      deleteFn: deleteLibraryMedia,
      onSuccess: () => onOpenChange(false),
    })

  const form = useAppForm({
    defaultValues: getInitialValues(media, mode),
    onSubmit: async ({ value }) => {
      const urlForValidation =
        value.url || (value.kind === 'pdf' && fileObject ? 'upload' : '')

      if (mode === 'create') {
        const result = createMediaSchema.safeParse({
          title: value.title,
          category: value.category,
          description: value.description,
          isPublished: value.isPublished,
          kind: value.kind,
          url: urlForValidation,
          fileSize: fileObject?.size,
        })

        if (!result.success) {
          setSubmitErrors(extractFieldErrors(result.error.issues))
          return
        }

        let url = result.data.url
        let fileSize = result.data.fileSize

        if (value.kind === 'pdf' && fileObject) {
          setUploading(true)
          try {
            const uploaded = await uploadMediaPdfFn({
              data: {
                fileData: fileData!,
                fileName: fileObject.name,
                fileType: fileObject.type,
                fileSize: fileObject.size,
              },
            })

            if (uploaded.fileUrl) {
              url = uploaded.fileUrl
              fileSize = fileObject.size
            }
          } catch (error) {
            toast.error(toUserError(error).message)
            setUploading(false)
            return
          }
          setUploading(false)
        }

        setSubmitErrors({})
        createMutation.mutate({
          data: {
            title: result.data.title,
            category: result.data.category,
            description: result.data.description,
            isPublished: result.data.isPublished,
            kind: result.data.kind,
            url,
            fileSize,
          },
        })
        return
      }

      if (!media) return

      const result = updateMediaSchema.safeParse({
        mediaId: media.id,
        title: value.title,
        category: value.category,
        description: value.description,
        isPublished: value.isPublished,
        kind: value.kind,
        url: urlForValidation,
        fileSize: fileObject?.size,
      })

      if (!result.success) {
        setSubmitErrors(extractFieldErrors(result.error.issues))
        return
      }

      let url = result.data.url
      let fileSize = result.data.fileSize

      if (value.kind === 'pdf' && fileObject) {
        setUploading(true)
        try {
          const uploaded = await uploadMediaPdfFn({
            data: {
              fileData: fileData!,
              fileName: fileObject.name,
              fileType: fileObject.type,
              fileSize: fileObject.size,
              oldUrl: media.fileUrl,
            },
          })

          if (uploaded.fileUrl) {
            url = uploaded.fileUrl
            fileSize = fileObject.size
          }
        } catch (error) {
          toast.error(toUserError(error).message)
          setUploading(false)
          return
        }
        setUploading(false)
      }

      setSubmitErrors({})
      updateMutation.mutate({
        data: {
          mediaId: result.data.mediaId,
          title: result.data.title,
          category: result.data.category,
          description: result.data.description,
          isPublished: result.data.isPublished,
          kind: result.data.kind,
          url,
          fileSize,
        },
      })
    },
  })

  useEffect(() => {
    if (!open) return
    setSubmitErrors({})
    clearFile()
    form.reset(getInitialValues(media, mode))
  }, [open, media, mode, form, clearFile])

  const clearError = (field: keyof MediaFormData) => {
    if (!submitErrors[field]) return
    setSubmitErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  if (mode === 'delete') {
    return (
      <DeleteConfirmDialog
        open={open}
        onOpenChange={onOpenChange}
        entityName="Media"
        onConfirm={() => {
          if (!media) return
          deleteMutation.mutate({ data: { mediaId: media.id } })
        }}
        isDeleting={deleteMutation.isPending}
      />
    )
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={mode === 'create' ? 'Create Media' : 'Edit Media'}
      subtitle={
        mode === 'create'
          ? 'Add a new item to the library'
          : 'Update this library item'
      }
      maxWidth="3xl"
      onSubmit={() => void form.handleSubmit()}
      isSubmitting={isAnyPending || isUploading}
      submitLabel={mode === 'create' ? 'Create Media' : 'Save Changes'}
      loadingLabel={isUploading ? 'Uploading...' : undefined}
    >
      <DialogBody>
        <FieldGroup className="mt-6 gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.AppField name="title">
              {(field) => (
                <field.TextField
                  id="media-title"
                  label="Name"
                  required
                  className="sm:col-span-2"
                  placeholder="Lesson recap video"
                  error={submitErrors.title}
                  onValueChange={() => clearError('title')}
                />
              )}
            </form.AppField>

            <form.AppField name="category">
              {(field) => (
                <field.TextField
                  id="media-category"
                  label="Category"
                  required
                  placeholder="Foundations"
                  error={submitErrors.category}
                  onValueChange={() => clearError('category')}
                />
              )}
            </form.AppField>

            <form.AppField name="kind">
              {(field) => (
                <FormFieldSelect
                  id="media-kind"
                  label="Type"
                  value={field.state.value}
                  onChange={(value) => {
                    field.handleChange(value as MediaKind)
                    if (value === 'youtube') clearFile()
                  }}
                >
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </FormFieldSelect>
              )}
            </form.AppField>

            <form.Subscribe selector={(state) => state.values.kind}>
              {(kind) => (
                <form.AppField name="url">
                  {(field) => (
                    <Field className="sm:col-span-2">
                      <FieldLabel
                        htmlFor="media-url"
                        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                      >
                        {kind === 'youtube' ? 'YouTube URL' : 'PDF URL'}
                        {kind === 'youtube' || !fileObject ? (
                          <span className="text-[#C5A059]">*</span>
                        ) : (
                          <span className="text-[#8E816D]">
                            (optional if file uploaded)
                          </span>
                        )}
                      </FieldLabel>
                      <Input
                        id="media-url"
                        value={field.state.value}
                        placeholder={
                          kind === 'youtube'
                            ? 'https://www.youtube.com/watch?v=...'
                            : 'https://.../file.pdf'
                        }
                        className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50${submitErrors.url ? 'border-red-500/60' : ''}`}
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                          clearError('url')
                        }}
                      />
                      {submitErrors.url && (
                        <p className="text-[0.68rem] text-red-400">
                          {submitErrors.url}
                        </p>
                      )}
                    </Field>
                  )}
                </form.AppField>
              )}
            </form.Subscribe>

            <form.AppField name="kind">
              {(field) =>
                field.state.value === 'pdf' ? (
                  <Field className="sm:col-span-2">
                    <FieldLabel className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                      Upload PDF (optional)
                    </FieldLabel>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {fileObject ? (
                      <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-[#F8F4EC]">
                            {fileObject.name}
                          </div>
                          <div className="mt-1 text-xs text-[#8E816D]">
                            PDF will be uploaded on save
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          theme="dark"
                          size="icon"
                          className="rounded-none"
                          onClick={clearFile}
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
                        className="w-full rounded-none border-white/12 bg-white/6 text-[#AFA28F] hover:border-[#C5A059]/40 hover:bg-white/10"
                      >
                        <UploadIcon className="mr-2 size-4" />
                        Upload PDF
                      </Button>
                    )}
                    <p className="text-xs text-[#8E816D]">PDF. Max 25MB.</p>
                  </Field>
                ) : null
              }
            </form.AppField>

            <form.AppField name="description">
              {(field) => (
                <field.TextAreaField
                  id="media-description"
                  label="Description"
                  className="sm:col-span-2"
                  placeholder="Short summary for students"
                  rows={6}
                />
              )}
            </form.AppField>

            <form.AppField name="isPublished">
              {(field) => (
                <field.SwitchField
                  id="media-published"
                  label="Published"
                  className="sm:col-span-2"
                />
              )}
            </form.AppField>
          </div>
        </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
