import { useEffect } from 'react'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { MediaLibraryRow } from '@/utils/library/library'
import { createMediaSchema } from '@/schemas/media.schema'
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
import { LIBRARY_TOPICS, type LibraryTopic } from '@/lib/library-topics'

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

type MediaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: MediaDialogMode
  media?: MediaLibraryRow
  onSuccess?: () => void
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

export function MediaDialog({
  open,
  onOpenChange,
  mode,
  media,
  onSuccess,
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

  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createLibraryMedia,
      updateFn: updateLibraryMedia,
      deleteFn: deleteLibraryMedia,
      onSuccess: () => {
        onOpenChange(false)
        onSuccess?.()
      },
    })

  const form = useAppForm({
    defaultValues: getInitialValues(media, mode),
    onSubmit: async ({ value }) => {
      let url = value.url
      let fileSize: number | undefined

      if (value.kind === 'pdf' && fileObject) {
        setUploading(true)
        try {
          const uploaded = await uploadMediaPdfFn({
            data: {
              fileData: fileData!,
              fileName: fileObject.name,
              fileType: fileObject.type,
              fileSize: fileObject.size,
              ...(mode === 'edit' && media ? { oldUrl: media.fileUrl } : {}),
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

      const payload = {
        title: value.title,
        category: value.category as LibraryTopic,
        description: value.description || undefined,
        isPublished: value.isPublished,
        kind: value.kind,
        url,
        fileSize,
      }

      if (mode === 'create') {
        createMutation.mutate({ data: payload })
        return
      }

      if (!media) return
      updateMutation.mutate({ data: { ...payload, mediaId: media.id } })
    },
  })

  useEffect(() => {
    if (!open) return
    clearFile()
    form.reset(getInitialValues(media, mode))
  }, [open, media, mode, form, clearFile])

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
            <form.AppField
              name="title"
              validators={{ onSubmit: createMediaSchema.shape.title }}
            >
              {(field) => (
                <field.TextField
                  id="media-title"
                  label="Name"
                  required
                  className="sm:col-span-2"
                  placeholder="Lesson recap video"
                />
              )}
            </form.AppField>

            <form.AppField
              name="category"
              validators={{ onSubmit: createMediaSchema.shape.category }}
            >
              {(field) => (
                <FormFieldSelect
                  id="media-category"
                  label="Category"
                  required
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  placeholder="Select topic..."
                  error={
                    field.state.meta.errors.length > 0
                      ? String(field.state.meta.errors[0])
                      : undefined
                  }
                >
                  {LIBRARY_TOPICS.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </FormFieldSelect>
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
                <form.AppField
                  name="url"
                  validators={{
                    onSubmit: ({ value, fieldApi }) => {
                      const currentKind = fieldApi.form.state.values.kind
                      if (currentKind === 'pdf' && fileObject) return undefined
                      if (!value) return 'URL is required'
                      return undefined
                    },
                  }}
                >
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
                        className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50 ${field.state.meta.errors.length > 0 ? 'border-red-500/60' : ''}`}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-[0.68rem] text-red-400">
                          {String(field.state.meta.errors[0])}
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
