import { useEffect, useState } from 'react'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { uploadThumbnailIfPresent } from './media-dialog.logic'
import type { MediaLibraryRow } from '@/utils/library/library'
import type {
  MediaDialogMode,
  MediaFormData,
  MediaKind,
  MediaSubmitPayload,
} from '@/components/dialog/media-dialog/media-dialog.domain'
import { createMediaSchema } from '@/schemas/media.schema'
import {
  createLibraryMedia,
  deleteLibraryMedia,
  updateLibraryMedia,
  uploadMediaPdfFn,
} from '@/utils/library/library'
import { toUserError } from '@/utils/errors'
import { useAppForm, withForm } from '@/hooks/form'
import { useEntityMutation } from '@/hooks/useEntityMutation'
import { useFileUpload } from '@/hooks/useFileUpload'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog/FormDialog'
import { Input } from '@/components/ui/input'
import { SelectItem } from '@/components/ui/select'
import { FormFieldSelect } from '@/components/ui/form-field/form-field'
import { LIBRARY_TOPICS } from '@/lib/library-topics'
import {
  buildMediaPayload,
  buildPdfUploadData,
  computeOpenResetState,
  emptyFormData,
  getDocumentFileVariant,
  getFilenameFromUrl,
  getInitialValues,
  getMediaDialogChrome,
  getMediaLoadingLabel,
  getThumbnailPreviewSrc,
  isMediaDialogSubmitting,
  preflightDocumentUrl,
  resolveDocumentUploadResult,
} from '@/components/dialog/media-dialog/media-dialog.domain'

const DOCUMENT_ACCEPT = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

type MediaDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: MediaDialogMode
  media?: MediaLibraryRow
  courseId?: string
  onSuccess?: () => void
}

async function resolveDocumentUrl(params: {
  docUpload: ReturnType<typeof useFileUpload>
  existingDocUrl: string | null
  mode: MediaDialogMode
  media: MediaLibraryRow | undefined
  currentUrl: string
}) {
  const { docUpload, existingDocUrl, mode, media, currentUrl } = params

  const preflight = preflightDocumentUrl({
    hasFile: Boolean(docUpload.fileObject),
    existingDocUrl,
  })
  if (preflight !== null) return preflight

  docUpload.setUploading(true)
  try {
    const uploaded = await uploadMediaPdfFn({
      data: buildPdfUploadData({
        fileData: docUpload.fileData!,
        fileName: docUpload.fileObject!.name,
        fileType: docUpload.fileObject!.type,
        fileSize: docUpload.fileObject!.size,
        mode,
        media,
      }),
    })
    return resolveDocumentUploadResult({
      fileUrl: uploaded.fileUrl,
      currentUrl,
      fileSize: docUpload.fileObject!.size,
    })
  } catch (error) {
    return { ok: false as const, message: toUserError(error).message }
  } finally {
    docUpload.setUploading(false)
  }
}

function dispatchMediaMutation(params: {
  mode: MediaDialogMode
  media: MediaLibraryRow | undefined
  payload: MediaSubmitPayload
  createMutation: { mutate: (args: { data: MediaSubmitPayload }) => void }
  updateMutation: {
    mutate: (args: { data: MediaSubmitPayload & { mediaId: string } }) => void
  }
}) {
  if (params.mode === 'create') {
    params.createMutation.mutate({ data: params.payload })
    return
  }
  if (!params.media) return
  params.updateMutation.mutate({
    data: { ...params.payload, mediaId: params.media.id },
  })
}

async function submitMediaForm(params: {
  value: MediaFormData
  docUpload: ReturnType<typeof useFileUpload>
  existingDocUrl: string | null
  mode: MediaDialogMode
  media: MediaLibraryRow | undefined
  courseId: string | undefined
  createMutation: { mutate: (args: { data: MediaSubmitPayload }) => void }
  updateMutation: {
    mutate: (args: { data: MediaSubmitPayload & { mediaId: string } }) => void
  }
}) {
  const {
    value,
    docUpload,
    existingDocUrl,
    mode,
    media,
    courseId,
    createMutation,
    updateMutation,
  } = params

  let url = value.url
  let fileSize: number | undefined

  if (value.kind === 'document') {
    const resolved = await resolveDocumentUrl({
      docUpload,
      existingDocUrl,
      mode,
      media,
      currentUrl: value.url,
    })
    if (!resolved.ok) {
      toast.error(resolved.message)
      return
    }
    url = resolved.url
    fileSize = resolved.fileSize
  }

  dispatchMediaMutation({
    mode,
    media,
    payload: buildMediaPayload({ value, url, fileSize, courseId }),
    createMutation,
    updateMutation,
  })
}

function DocumentFilePicked({
  docUpload,
}: {
  docUpload: ReturnType<typeof useFileUpload>
}) {
  return (
    <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm text-[#F8F4EC]">
          {docUpload.fileObject!.name}
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
  )
}

function DocumentFileExisting({
  existingDocUrl,
  docUpload,
}: {
  existingDocUrl: string
  docUpload: ReturnType<typeof useFileUpload>
}) {
  return (
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
        onClick={() => docUpload.fileInputRef.current?.click()}
      >
        Replace
      </Button>
    </div>
  )
}

function DocumentFileEmpty({
  docUpload,
}: {
  docUpload: ReturnType<typeof useFileUpload>
}) {
  return (
    <Button
      theme="dark"
      type="button"
      variant="outline"
      onClick={() => docUpload.fileInputRef.current?.click()}
      className="w-full rounded-none border-white/12 bg-white/6 text-[#AFA28F] hover:border-[#C5A059]/40 hover:bg-white/10"
    >
      <UploadIcon className="mr-2 size-4" />
      Upload Document
    </Button>
  )
}

function DocumentFileVariant({
  variant,
  docUpload,
  existingDocUrl,
}: {
  variant: ReturnType<typeof getDocumentFileVariant>
  docUpload: ReturnType<typeof useFileUpload>
  existingDocUrl: string | null
}) {
  if (variant === 'picked') {
    return <DocumentFilePicked docUpload={docUpload} />
  }
  if (variant === 'existing') {
    return (
      <DocumentFileExisting
        existingDocUrl={existingDocUrl!}
        docUpload={docUpload}
      />
    )
  }
  return <DocumentFileEmpty docUpload={docUpload} />
}

function DocumentFileControl({
  docUpload,
  existingDocUrl,
  mode,
}: {
  docUpload: ReturnType<typeof useFileUpload>
  existingDocUrl: string | null
  mode: MediaDialogMode
}) {
  const variant = getDocumentFileVariant({
    hasPickedFile: Boolean(docUpload.fileObject),
    hasExistingDoc: Boolean(existingDocUrl),
  })

  return (
    <Field className="sm:col-span-2">
      <FieldLabel className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
        Document File
        {mode === 'create' && <span className="text-[#C5A059]">*</span>}
      </FieldLabel>
      <input
        ref={docUpload.fileInputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        onChange={docUpload.handleFileChange}
        className="hidden"
      />
      <DocumentFileVariant
        variant={variant}
        docUpload={docUpload}
        existingDocUrl={existingDocUrl}
      />
      <p className="text-xs text-[#8E816D]">PDF, PPTX, or DOCX. Max 25MB.</p>
    </Field>
  )
}

type ThumbnailControlProps = {
  thumbUpload: ReturnType<typeof useFileUpload>
  thumbnailUrl: string | null
  onClearThumbnail: () => void
}

function ThumbnailControl({
  thumbUpload,
  thumbnailUrl,
  onClearThumbnail,
}: ThumbnailControlProps) {
  const previewSrc = getThumbnailPreviewSrc({
    fileData: thumbUpload.fileData,
    thumbnailUrl,
  })

  return (
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
        {previewSrc ? (
          <div className="relative aspect-video w-full overflow-hidden border border-white/10">
            <img
              src={previewSrc}
              alt="Media thumbnail"
              className="size-full object-cover"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 rounded-none border-white/20 bg-black/40 text-white hover:bg-black/60"
              onClick={onClearThumbnail}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            theme="dark"
            type="button"
            variant="outline"
            onClick={() => thumbUpload.fileInputRef.current?.click()}
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
  )
}

type MediaFormFieldsProps = {
  docUpload: ReturnType<typeof useFileUpload>
  thumbUpload: ReturnType<typeof useFileUpload>
  existingDocUrl: string | null
  thumbnailUrl: string | null
  mode: MediaDialogMode
  onYoutubeSelected: () => void
  onClearThumbnail: () => void
}

type MediaDocumentFieldsProps = {
  docUpload: ReturnType<typeof useFileUpload>
  thumbUpload: ReturnType<typeof useFileUpload>
  existingDocUrl: string | null
  thumbnailUrl: string | null
  mode: MediaDialogMode
  onClearThumbnail: () => void
}

const MediaTitleCategoryFields = withForm({
  defaultValues: emptyFormData,
  render: ({ form }) => (
    <>
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
    </>
  ),
})

const MediaKindField = withForm({
  defaultValues: emptyFormData,
  props: {} as { onYoutubeSelected: () => void },
  render: ({ form, onYoutubeSelected }) => (
    <form.AppField name="kind">
      {(field) => (
        <FormFieldSelect
          id="media-kind"
          label="Type"
          value={field.state.value}
          onChange={(value) => {
            field.handleChange(value as MediaKind)
            if (value === 'youtube') onYoutubeSelected()
          }}
        >
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="document">Document</SelectItem>
        </FormFieldSelect>
      )}
    </form.AppField>
  ),
})

const MediaYoutubeUrlField = withForm({
  defaultValues: emptyFormData,
  render: ({ form }) => (
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
  ),
})

const MediaDocumentFields = withForm({
  defaultValues: emptyFormData,
  props: {} as MediaDocumentFieldsProps,
  render: ({
    form,
    docUpload,
    thumbUpload,
    existingDocUrl,
    thumbnailUrl,
    mode,
    onClearThumbnail,
  }) => (
    <form.Subscribe selector={(state) => state.values.kind}>
      {(kind) =>
        kind === 'document' ? (
          <>
            <DocumentFileControl
              docUpload={docUpload}
              existingDocUrl={existingDocUrl}
              mode={mode}
            />

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

            <ThumbnailControl
              thumbUpload={thumbUpload}
              thumbnailUrl={thumbnailUrl}
              onClearThumbnail={onClearThumbnail}
            />

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
  ),
})

const MediaYoutubeExtraFields = withForm({
  defaultValues: emptyFormData,
  render: ({ form }) => (
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
  ),
})

const MediaFormFields = withForm({
  defaultValues: emptyFormData,
  props: {} as MediaFormFieldsProps,
  render: ({
    form,
    docUpload,
    thumbUpload,
    existingDocUrl,
    thumbnailUrl,
    mode,
    onYoutubeSelected,
    onClearThumbnail,
  }) => (
    <FieldGroup className="mt-6 gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MediaTitleCategoryFields form={form} />
        <MediaKindField form={form} onYoutubeSelected={onYoutubeSelected} />
        <MediaYoutubeUrlField form={form} />
        <MediaDocumentFields
          form={form}
          docUpload={docUpload}
          thumbUpload={thumbUpload}
          existingDocUrl={existingDocUrl}
          thumbnailUrl={thumbnailUrl}
          mode={mode}
          onClearThumbnail={onClearThumbnail}
        />
        <MediaYoutubeExtraFields form={form} />
      </div>
    </FieldGroup>
  ),
})

function useMediaUploads() {
  const docUpload = useFileUpload()
  const thumbUpload = useFileUpload()
  const [existingDocUrl, setExistingDocUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  const onYoutubeSelected = () => {
    docUpload.clearFile()
    thumbUpload.clearFile()
    setThumbnailUrl(null)
  }

  const onClearThumbnail = () => {
    thumbUpload.clearFile()
    setThumbnailUrl(null)
  }

  return {
    docUpload,
    thumbUpload,
    existingDocUrl,
    setExistingDocUrl,
    thumbnailUrl,
    setThumbnailUrl,
    onYoutubeSelected,
    onClearThumbnail,
  }
}

function useMediaDialog(props: MediaDialogProps) {
  const { open, onOpenChange, mode, media, courseId, onSuccess } = props
  const uploads = useMediaUploads()
  const {
    docUpload,
    thumbUpload,
    existingDocUrl,
    setExistingDocUrl,
    setThumbnailUrl,
  } = uploads

  const { createMutation, updateMutation, deleteMutation, isAnyPending } =
    useEntityMutation({
      createFn: createLibraryMedia,
      updateFn: updateLibraryMedia,
      deleteFn: deleteLibraryMedia,
      onSuccess: async ({ data }) => {
        const mediaId = (data as { media: { id: string } }).media.id
        await uploadThumbnailIfPresent(thumbUpload, mediaId)
        thumbUpload.clearFile()
        setThumbnailUrl(null)
        onOpenChange(false)
        onSuccess?.()
      },
    })

  const form = useAppForm({
    defaultValues: getInitialValues(media, mode, courseId),
    onSubmit: ({ value }) =>
      submitMediaForm({
        value,
        docUpload,
        existingDocUrl,
        mode,
        media,
        courseId,
        createMutation,
        updateMutation,
      }),
  })

  const clearDocFile = docUpload.clearFile
  const clearThumbFile = thumbUpload.clearFile

  useEffect(() => {
    if (!open) return
    const reset = computeOpenResetState({ mode, media })
    setExistingDocUrl(reset.existingDocUrl)
    setThumbnailUrl(reset.thumbnailUrl)
    clearDocFile()
    clearThumbFile()
    form.reset(getInitialValues(media, mode, courseId))
  }, [open, media, mode, form, courseId, clearDocFile, clearThumbFile])

  return { uploads, form, deleteMutation, isAnyPending }
}

export function MediaDialog(props: MediaDialogProps) {
  const { open, onOpenChange, mode, media } = props
  const { uploads, form, deleteMutation, isAnyPending } = useMediaDialog(props)
  const {
    docUpload,
    thumbUpload,
    existingDocUrl,
    thumbnailUrl,
    onYoutubeSelected,
    onClearThumbnail,
  } = uploads

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

  const chrome = getMediaDialogChrome(mode)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={chrome.title}
      subtitle={chrome.subtitle}
      maxWidth="3xl"
      onSubmit={() => void form.handleSubmit()}
      isSubmitting={isMediaDialogSubmitting({
        isAnyPending,
        isDocUploading: docUpload.isUploading,
        isThumbUploading: thumbUpload.isUploading,
      })}
      submitLabel={chrome.submitLabel}
      loadingLabel={getMediaLoadingLabel(docUpload.isUploading)}
    >
      <MediaFormFields
        form={form}
        docUpload={docUpload}
        thumbUpload={thumbUpload}
        existingDocUrl={existingDocUrl}
        thumbnailUrl={thumbnailUrl}
        mode={mode}
        onYoutubeSelected={onYoutubeSelected}
        onClearThumbnail={onClearThumbnail}
      />
    </FormDialog>
  )
}
