import { useEffect, useState } from 'react'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { MediaLibraryRow } from '@/utils/library/library'
import {
  createMediaSchema,
  deleteMediaSchema,
  updateMediaSchema,
} from '@/schemas/media.schema'
import {
  createLibraryMedia,
  deleteLibraryMedia,
  updateLibraryMedia,
  uploadMediaPdfFn,
} from '@/utils/library/library'
import { toUserError } from '@/utils/errors'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { FormDialog } from '@/components/ui/form-dialog'
import { DialogBody } from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectItem } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  FormFieldInput,
  FormFieldSelect,
  FormFieldTextarea,
} from '@/components/ui/form-field'

type MediaDialogMode = 'create' | 'edit' | 'delete'

type MediaKind = 'youtube' | 'pdf'

type MediaFormData = {
  title: string
  category: string
  description: string
  kind: MediaKind
  url: string
  isPublished: boolean
  pdfFile: File | null
}

type MediaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: MediaDialogMode
  media?: MediaLibraryRow
}

const emptyForm: MediaFormData = {
  title: '',
  category: '',
  description: '',
  kind: 'youtube',
  url: '',
  isPublished: false,
  pdfFile: null,
}

function fromFileType(
  fileType: MediaLibraryRow['fileType'],
): MediaFormData['kind'] {
  if (fileType === 'document') return 'pdf'
  return 'youtube'
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

  const [formData, setFormData] = useState<MediaFormData>({ ...emptyForm })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return

    setFieldErrors({})

    if ((mode === 'edit' || mode === 'delete') && media) {
      setFormData({
        title: media.title,
        category: media.category,
        description: media.description ?? '',
        kind: fromFileType(media.fileType),
        url: media.fileUrl,
        isPublished: media.isPublished,
        pdfFile: null,
      })

      clearFile()

      return
    }

    setFormData({ ...emptyForm })
    clearFile()
  }, [open, mode, media])

  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createLibraryMedia,
      updateFn: updateLibraryMedia,
      deleteFn: deleteLibraryMedia,
      onSuccess: () => {
        onOpenChange(false)
      },
    })

  const isPending = isAnyPending || isUploading

  const handleSubmit = async () => {
    if (mode === 'delete') {
      const parseResult = deleteMediaSchema.safeParse({
        mediaId: media?.id,
      })

      if (!parseResult.success) {
        toast.error('Invalid media item')
        return
      }

      deleteMutation.mutate({ data: parseResult.data })
      return
    }

    const urlForValidation =
      formData.url ||
      (formData.kind === 'pdf' && formData.pdfFile ? 'upload' : '')

    if (mode === 'create') {
      const parseResult = createMediaSchema.safeParse({
        title: formData.title,
        category: formData.category,
        description: formData.description,
        isPublished: formData.isPublished,
        kind: formData.kind,
        url: urlForValidation,
        fileSize: formData.pdfFile ? formData.pdfFile.size : undefined,
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

      setFieldErrors({})

      let url = parseResult.data.url
      let fileSize = parseResult.data.fileSize

      if (formData.kind === 'pdf' && formData.pdfFile) {
        setUploading(true)
        try {
          const result = await uploadMediaPdfFn({
            data: {
              fileData: fileData!,
              fileName: fileObject!.name,
              fileType: fileObject!.type,
              fileSize: fileObject!.size,
            },
          })

          if (result.fileUrl) {
            url = result.fileUrl
            fileSize = fileObject!.size
          }
        } catch (error) {
          toast.error(toUserError(error).message)
          setUploading(false)
          return
        }
        setUploading(false)
      }

      createMutation.mutate({
        data: {
          title: parseResult.data.title,
          category: parseResult.data.category,
          description: parseResult.data.description,
          isPublished: parseResult.data.isPublished,
          kind: parseResult.data.kind,
          url,
          fileSize,
        },
      })
      return
    }

    const parseResult = updateMediaSchema.safeParse({
      mediaId: media?.id,
      title: formData.title,
      category: formData.category,
      description: formData.description,
      isPublished: formData.isPublished,
      kind: formData.kind,
      url: urlForValidation,
      fileSize: formData.pdfFile ? formData.pdfFile.size : undefined,
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

    setFieldErrors({})

    let url = parseResult.data.url
    let fileSize = parseResult.data.fileSize

    if (formData.kind === 'pdf' && formData.pdfFile) {
      setUploading(true)
      try {
        const result = await uploadMediaPdfFn({
          data: {
            fileData: fileData!,
            fileName: fileObject!.name,
            fileType: fileObject!.type,
            fileSize: fileObject!.size,
            oldUrl: media?.fileUrl,
          },
        })

        if (result.fileUrl) {
          url = result.fileUrl
          fileSize = fileObject!.size
        }
      } catch (error) {
        toast.error(toUserError(error).message)
        setUploading(false)
        return
      }
      setUploading(false)
    }

    updateMutation.mutate({
      data: {
        mediaId: parseResult.data.mediaId,
        title: parseResult.data.title,
        category: parseResult.data.category,
        description: parseResult.data.description,
        isPublished: parseResult.data.isPublished,
        kind: parseResult.data.kind,
        url,
        fileSize,
      },
    })
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
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={mode === 'create' ? 'Create Media' : 'Save Changes'}
      loadingLabel={isUploading ? 'Uploading...' : undefined}
    >
      <DialogBody>
        <FieldGroup className="mt-6 gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormFieldInput
              id="media-title"
              label="Name"
              required
              className="sm:col-span-2"
              value={formData.title}
              onChange={(value) => {
                setFormData({ ...formData, title: value })
                if (fieldErrors.title)
                  setFieldErrors({ ...fieldErrors, title: '' })
              }}
              error={fieldErrors.title}
              placeholder="Lesson recap video"
            />

            <FormFieldInput
              id="media-category"
              label="Category"
              required
              value={formData.category}
              onChange={(value) => {
                setFormData({ ...formData, category: value })
                if (fieldErrors.category)
                  setFieldErrors({ ...fieldErrors, category: '' })
              }}
              error={fieldErrors.category}
              placeholder="Foundations"
            />

            <FormFieldSelect
              id="media-kind"
              label="Type"
              value={formData.kind}
              onChange={(value) => {
                const kind = value as MediaFormData['kind']
                setFormData({
                  ...formData,
                  kind,
                  pdfFile: null,
                })
                clearFile()
              }}
            >
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </FormFieldSelect>

            <Field className="sm:col-span-2">
              <FieldLabel
                htmlFor="media-url"
                className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
              >
                {formData.kind === 'youtube' ? 'YouTube URL' : 'PDF URL'}
                {formData.kind === 'youtube' || !formData.pdfFile ? (
                  <span className="text-[#C5A059]">*</span>
                ) : (
                  <span className="text-[#8E816D]">
                    (optional if file uploaded)
                  </span>
                )}
              </FieldLabel>
              <Input
                id="media-url"
                value={formData.url}
                placeholder={
                  formData.kind === 'youtube'
                    ? 'https://www.youtube.com/watch?v=...'
                    : 'https://.../file.pdf'
                }
                className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50${fieldErrors.url ? 'border-red-500/60' : ''}`}
                onChange={(e) => {
                  setFormData({ ...formData, url: e.target.value })
                  if (fieldErrors.url)
                    setFieldErrors({ ...fieldErrors, url: '' })
                }}
              />
              {fieldErrors.url && (
                <p className="text-[0.68rem] text-red-400">{fieldErrors.url}</p>
              )}
            </Field>

            {formData.kind === 'pdf' && (
              <Field className="sm:col-span-2">
                <FieldLabel className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                  Upload PDF (optional)
                </FieldLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={async (e) => {
                    await handleFileChange(e)
                    if (fileObject) {
                      setFormData({ ...formData, pdfFile: fileObject })
                    }
                  }}
                  className="hidden"
                />

                {formData.pdfFile ? (
                  <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-[#F8F4EC]">
                        {formData.pdfFile.name}
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
                      onClick={() => {
                        setFormData({ ...formData, pdfFile: null })
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
                    className="w-full rounded-none border-white/12 bg-white/6 text-[#AFA28F] hover:border-[#C5A059]/40 hover:bg-white/10"
                  >
                    <UploadIcon className="mr-2 size-4" />
                    Upload PDF
                  </Button>
                )}

                <p className="text-xs text-[#8E816D]">PDF. Max 25MB.</p>
              </Field>
            )}

            <FormFieldTextarea
              id="media-description"
              label="Description"
              className="sm:col-span-2"
              value={formData.description}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  description: value,
                })
              }
              placeholder="Short summary for students"
              rows={6}
            />

            <Field className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <Switch
                  id="media-published"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPublished: checked })
                  }
                />
                <FieldLabel htmlFor="media-published" className="text-sm">
                  Published
                </FieldLabel>
              </div>
            </Field>
          </div>
        </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
