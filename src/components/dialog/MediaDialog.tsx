import { useEffect, useState } from 'react'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { MediaLibraryRow } from '@/utils/library/library'
import type { LibraryTopic } from '@/lib/library-topics'
import { createMediaSchema } from '@/schemas/media.schema'
import {
  createLibraryMedia,
  deleteLibraryMedia,
  updateLibraryMedia,
  uploadMediaPdfFn,
  uploadMediaThumbnailFn,
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
import { LIBRARY_TOPICS } from '@/lib/library-topics'

type MediaDialogMode = 'create' | 'edit' | 'delete'

type MediaKind = 'youtube' | 'document'

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
  courseId?: string
  onSuccess?: () => void
}

const DOCUMENT_ACCEPT = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

const emptyFormData: MediaFormData = {
  title: '',
  category: '',
  description: '',
  kind: 'youtube',
  url: '',
  isPublished: false,
}

function fromFileType(fileType: MediaLibraryRow['fileType']): MediaKind {
  return fileType === 'document' ? 'document' : 'youtube'
}

function getInitialValues(
  media: MediaDialogProps['media'],
  mode: MediaDialogMode,
  courseId: string | undefined,
): MediaFormData {
  if (!media || mode === 'create') {
    return { ...emptyFormData, kind: courseId ? 'document' : 'youtube' }
  }

  return {
    title: media.title,
    category: media.category,
    description: media.description ?? '',
    kind: fromFileType(media.fileType),
    url: '',
    isPublished: media.isPublished,
  }
}

function getFilenameFromUrl(url: string): string {
  return url.split('?')[0].split('/').pop() ?? url
}

export function MediaDialog({
  open,
  onOpenChange,
  mode,
  media,
  courseId,
  onSuccess,
}: MediaDialogProps) {
  const docUpload = useFileUpload()
  const thumbUpload = useFileUpload()
  const [existingDocUrl, setExistingDocUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createLibraryMedia,
      updateFn: updateLibraryMedia,
      deleteFn: deleteLibraryMedia,
      onSuccess: async ({ data }) => {
        const mediaId = (data as { media: { id: string } }).media.id
        if (thumbUpload.fileObject) {
          try {
            await uploadMediaThumbnailFn({
              data: {
                mediaId,
                fileData: thumbUpload.fileData!,
                fileName: thumbUpload.fileObject.name,
                fileType: thumbUpload.fileObject.type,
                fileSize: thumbUpload.fileObject.size,
              },
            })
          } catch (error) {
            toast.error(toUserError(error).message)
          }
        }
        thumbUpload.clearFile()
        setThumbnailUrl(null)
        onOpenChange(false)
        onSuccess?.()
      },
    })

  const form = useAppForm({
    defaultValues: getInitialValues(media, mode, courseId),
    onSubmit: async ({ value }) => {
      let url = value.url
      let fileSize: number | undefined

      if (value.kind === 'document') {
        if (docUpload.fileObject) {
          docUpload.setUploading(true)
          try {
            const uploaded = await uploadMediaPdfFn({
              data: {
                fileData: docUpload.fileData!,
                fileName: docUpload.fileObject.name,
                fileType: docUpload.fileObject.type,
                fileSize: docUpload.fileObject.size,
                ...(mode === 'edit' && media ? { oldUrl: media.fileUrl } : {}),
              },
            })
            if (uploaded.fileUrl) {
              url = uploaded.fileUrl
              fileSize = docUpload.fileObject.size
            }
          } catch (error) {
            toast.error(toUserError(error).message)
            docUpload.setUploading(false)
            return
          }
          docUpload.setUploading(false)
        } else if (existingDocUrl) {
          url = existingDocUrl
        } else {
          toast.error('Please upload a document file')
          return
        }
      }

      const payload = {
        title: value.title,
        category: value.category as LibraryTopic,
        description: value.description || undefined,
        isPublished: value.isPublished,
        kind: value.kind,
        url,
        fileSize,
        courseId,
      }

      if (mode === 'create') {
        createMutation.mutate({ data: payload })
        return
      }

      if (!media) return
      updateMutation.mutate({ data: { ...payload, mediaId: media.id } })
    },
  })

  const clearDocFile = docUpload.clearFile
  const clearThumbFile = thumbUpload.clearFile

  useEffect(() => {
    if (!open) return
    const isDocEdit = mode === 'edit' && media?.fileType === 'document'
    setExistingDocUrl(isDocEdit ? media.fileUrl : null)
    setThumbnailUrl(media?.thumbnailUrl ?? null)
    clearDocFile()
    clearThumbFile()
    form.reset(getInitialValues(media, mode, courseId))
  }, [open, media, mode, form, courseId, clearDocFile, clearThumbFile])

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
      isSubmitting={
        isAnyPending || docUpload.isUploading || thumbUpload.isUploading
      }
      submitLabel={mode === 'create' ? 'Create Media' : 'Save Changes'}
      loadingLabel={docUpload.isUploading ? 'Uploading...' : undefined}
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
                    if (value === 'youtube') {
                      docUpload.clearFile()
                      thumbUpload.clearFile()
                      setThumbnailUrl(null)
                    }
                  }}
                >
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </FormFieldSelect>
              )}
            </form.AppField>

            {/* YouTube URL — only for video kind */}
            <form.Subscribe selector={(state) => state.values.kind}>
              {(kind) =>
                kind === 'youtube' ? (
                  <form.AppField
                    name="url"
                    validators={{
                      onSubmit: ({ value }) => {
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
                          YouTube URL
                          <span className="text-[#C5A059]">*</span>
                        </FieldLabel>
                        <Input
                          id="media-url"
                          value={field.state.value}
                          placeholder="https://www.youtube.com/watch?v=..."
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
                ) : null
              }
            </form.Subscribe>

            {/* Document upload + thumbnail — only for document kind */}
            <form.Subscribe selector={(state) => state.values.kind}>
              {(kind) =>
                kind === 'document' ? (
                  <>
                    {/* Document file upload */}
                    <Field className="sm:col-span-2">
                      <FieldLabel className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                        Document File
                        {mode === 'create' && (
                          <span className="text-[#C5A059]">*</span>
                        )}
                      </FieldLabel>
                      <input
                        ref={docUpload.fileInputRef}
                        type="file"
                        accept={DOCUMENT_ACCEPT}
                        onChange={docUpload.handleFileChange}
                        className="hidden"
                      />
                      {docUpload.fileObject ? (
                        <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm text-[#F8F4EC]">
                              {docUpload.fileObject.name}
                            </div>
                            <div className="mt-1 text-xs text-[#8E816D]">
                              File will be uploaded on save
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            theme="dark"
                            size="icon"
                            className="rounded-none"
                            onClick={docUpload.clearFile}
                          >
                            <XIcon className="size-4" />
                          </Button>
                        </div>
                      ) : existingDocUrl ? (
                        <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm text-[#F8F4EC]">
                              {getFilenameFromUrl(existingDocUrl)}
                            </div>
                            <div className="mt-1 text-xs text-[#8E816D]">
                              Current file — upload a new one to replace
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            theme="dark"
                            size="sm"
                            className="shrink-0 rounded-none border-white/12"
                            onClick={() =>
                              docUpload.fileInputRef.current?.click()
                            }
                          >
                            Replace
                          </Button>
                        </div>
                      ) : (
                        <Button
                          theme="dark"
                          type="button"
                          variant="outline"
                          onClick={() =>
                            docUpload.fileInputRef.current?.click()
                          }
                          className="w-full rounded-none border-white/12 bg-white/6 text-[#AFA28F] hover:border-[#C5A059]/40 hover:bg-white/10"
                        >
                          <UploadIcon className="mr-2 size-4" />
                          Upload Document
                        </Button>
                      )}
                      <p className="text-xs text-[#8E816D]">
                        PDF, PPTX, or DOCX. Max 25MB.
                      </p>
                    </Field>

                    {/* Description + Thumbnail side by side */}
                    <form.AppField name="description">
                      {(field) => (
                        <field.TextAreaField
                          id="media-description"
                          label="Description"
                          placeholder="Short summary for students"
                          rows={6}
                        />
                      )}
                    </form.AppField>

                    <Field>
                      <FieldLabel className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                        Thumbnail
                      </FieldLabel>
                      <div className="space-y-2">
                        <input
                          ref={thumbUpload.fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={thumbUpload.handleFileChange}
                          className="hidden"
                        />
                        {thumbUpload.fileData || thumbnailUrl ? (
                          <div className="relative aspect-video w-full overflow-hidden border border-white/10">
                            <img
                              src={thumbUpload.fileData || thumbnailUrl!}
                              alt="Media thumbnail"
                              className="size-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2 rounded-none border-white/20 bg-black/40 text-white hover:bg-black/60"
                              onClick={() => {
                                thumbUpload.clearFile()
                                setThumbnailUrl(null)
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
                            onClick={() =>
                              thumbUpload.fileInputRef.current?.click()
                            }
                            className="w-full rounded-none border-white/12 bg-white/6 text-[#AFA28F] hover:border-[#C5A059]/40 hover:bg-white/10"
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

                    <form.AppField name="isPublished">
                      {(field) => (
                        <field.SwitchField
                          id="media-published"
                          label="Published"
                          className="sm:col-span-2"
                        />
                      )}
                    </form.AppField>
                  </>
                ) : null
              }
            </form.Subscribe>

            {/* Fields shown only for youtube kind */}
            <form.Subscribe selector={(state) => state.values.kind}>
              {(kind) =>
                kind === 'youtube' ? (
                  <>
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
                  </>
                ) : null
              }
            </form.Subscribe>
          </div>
        </FieldGroup>
      </DialogBody>
    </FormDialog>
  )
}
