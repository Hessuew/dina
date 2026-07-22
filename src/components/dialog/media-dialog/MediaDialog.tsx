import { useEffect, useState } from 'react'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useVideoFilePick } from './media-dialog.hooks'
import {
  uploadThumbnailIfPresent,
  uploadVideoFileDirect,
} from './media-dialog.logic'
import type { VideoFilePick } from './media-dialog.hooks'
import type { MediaLibraryRow } from '@/utils/library/library'
import type {
  FileResolution,
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
  preflightVideoUrl,
  resolveDocumentUploadResult,
  validateYoutubeUrl,
} from '@/components/dialog/media-dialog/media-dialog.domain'

const DOCUMENT_ACCEPT = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

const VIDEO_ACCEPT = 'video/mp4,video/webm'

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

async function resolveVideoUrl(params: {
  videoPick: VideoFilePick
  existingVideoUrl: string | null
}) {
  const { videoPick, existingVideoUrl } = params
  const preflight = preflightVideoUrl({
    hasFile: Boolean(videoPick.file),
    existingVideoUrl,
  })
  if (preflight !== null) return preflight

  videoPick.setUploading(true)
  try {
    const uploaded = await uploadVideoFileDirect(videoPick.file!)
    return {
      ok: true as const,
      url: uploaded.fileUrl,
      fileSize: uploaded.fileSize,
    }
  } catch (error) {
    return { ok: false as const, message: toUserError(error).message }
  } finally {
    videoPick.setUploading(false)
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

async function resolveKindFileUrl(params: {
  value: MediaFormData
  docUpload: ReturnType<typeof useFileUpload>
  videoPick: VideoFilePick
  existingDocUrl: string | null
  existingVideoUrl: string | null
  mode: MediaDialogMode
  media: MediaLibraryRow | undefined
}): Promise<FileResolution | { ok: true; url: string; fileSize?: number }> {
  const { value } = params
  if (value.kind === 'document') {
    return resolveDocumentUrl({
      docUpload: params.docUpload,
      existingDocUrl: params.existingDocUrl,
      mode: params.mode,
      media: params.media,
      currentUrl: value.url,
    })
  }
  if (value.kind === 'video-file') {
    return resolveVideoUrl({
      videoPick: params.videoPick,
      existingVideoUrl: params.existingVideoUrl,
    })
  }
  return { ok: true, url: value.url }
}

async function submitMediaForm(params: {
  value: MediaFormData
  docUpload: ReturnType<typeof useFileUpload>
  videoPick: VideoFilePick
  existingDocUrl: string | null
  existingVideoUrl: string | null
  mode: MediaDialogMode
  media: MediaLibraryRow | undefined
  courseId: string | undefined
  createMutation: { mutate: (args: { data: MediaSubmitPayload }) => void }
  updateMutation: {
    mutate: (args: { data: MediaSubmitPayload & { mediaId: string } }) => void
  }
}) {
  const resolved = await resolveKindFileUrl(params)
  if (!resolved.ok) {
    toast.error(resolved.message)
    return
  }

  dispatchMediaMutation({
    mode: params.mode,
    media: params.media,
    payload: buildMediaPayload({
      value: params.value,
      url: resolved.url,
      fileSize: resolved.fileSize,
      courseId: params.courseId,
    }),
    createMutation: params.createMutation,
    updateMutation: params.updateMutation,
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

function VideoFilePicked({ videoPick }: { videoPick: VideoFilePick }) {
  return (
    <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm text-[#F8F4EC]">
          {videoPick.file!.name}
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
        onClick={videoPick.clearFile}
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  )
}

function VideoFileExisting({
  existingVideoUrl,
  videoPick,
}: {
  existingVideoUrl: string
  videoPick: VideoFilePick
}) {
  return (
    <div className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm text-[#F8F4EC]">
          {getFilenameFromUrl(existingVideoUrl)}
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
        onClick={() => videoPick.fileInputRef.current?.click()}
      >
        Replace
      </Button>
    </div>
  )
}

function VideoFileEmpty({ videoPick }: { videoPick: VideoFilePick }) {
  return (
    <Button
      theme="dark"
      type="button"
      variant="outline"
      onClick={() => videoPick.fileInputRef.current?.click()}
      className="w-full rounded-none border-white/12 bg-white/6 text-[#AFA28F] hover:border-[#C5A059]/40 hover:bg-white/10"
    >
      <UploadIcon className="mr-2 size-4" />
      Upload Video
    </Button>
  )
}

function VideoFileControl({
  videoPick,
  existingVideoUrl,
  mode,
}: {
  videoPick: VideoFilePick
  existingVideoUrl: string | null
  mode: MediaDialogMode
}) {
  const variant = getDocumentFileVariant({
    hasPickedFile: Boolean(videoPick.file),
    hasExistingDoc: Boolean(existingVideoUrl),
  })

  return (
    <Field className="sm:col-span-2">
      <FieldLabel className="text-[0.68rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
        Video File
        {mode === 'create' && <span className="text-[#C5A059]">*</span>}
      </FieldLabel>
      <input
        ref={videoPick.fileInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        onChange={videoPick.handleFileChange}
        className="hidden"
      />
      {variant === 'picked' ? (
        <VideoFilePicked videoPick={videoPick} />
      ) : variant === 'existing' ? (
        <VideoFileExisting
          existingVideoUrl={existingVideoUrl!}
          videoPick={videoPick}
        />
      ) : (
        <VideoFileEmpty videoPick={videoPick} />
      )}
      <p className="text-xs text-[#8E816D]">MP4 or WebM. Max 100MB.</p>
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
  videoPick: VideoFilePick
  thumbUpload: ReturnType<typeof useFileUpload>
  existingDocUrl: string | null
  existingVideoUrl: string | null
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

type MediaVideoFileFieldsProps = {
  videoPick: VideoFilePick
  thumbUpload: ReturnType<typeof useFileUpload>
  existingVideoUrl: string | null
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
          <SelectItem value="video-file">Video file</SelectItem>
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
              onSubmit: ({ value, fieldApi }) =>
                validateYoutubeUrl(value, fieldApi.form.state.values.kind),
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

const MediaVideoFileFields = withForm({
  defaultValues: emptyFormData,
  props: {} as MediaVideoFileFieldsProps,
  render: ({
    form,
    videoPick,
    thumbUpload,
    existingVideoUrl,
    thumbnailUrl,
    mode,
    onClearThumbnail,
  }) => (
    <form.Subscribe selector={(state) => state.values.kind}>
      {(kind) =>
        kind === 'video-file' ? (
          <>
            <VideoFileControl
              videoPick={videoPick}
              existingVideoUrl={existingVideoUrl}
              mode={mode}
            />

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
    videoPick,
    thumbUpload,
    existingDocUrl,
    existingVideoUrl,
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
        <MediaVideoFileFields
          form={form}
          videoPick={videoPick}
          thumbUpload={thumbUpload}
          existingVideoUrl={existingVideoUrl}
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
  const videoPick = useVideoFilePick()
  const thumbUpload = useFileUpload()
  const [existingDocUrl, setExistingDocUrl] = useState<string | null>(null)
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

  const onYoutubeSelected = () => {
    docUpload.clearFile()
    videoPick.clearFile()
    thumbUpload.clearFile()
    setThumbnailUrl(null)
  }

  const onClearThumbnail = () => {
    thumbUpload.clearFile()
    setThumbnailUrl(null)
  }

  return {
    docUpload,
    videoPick,
    thumbUpload,
    existingDocUrl,
    setExistingDocUrl,
    existingVideoUrl,
    setExistingVideoUrl,
    thumbnailUrl,
    setThumbnailUrl,
    onYoutubeSelected,
    onClearThumbnail,
  }
}

function useMediaDialogMutations(params: {
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  thumbUpload: ReturnType<typeof useFileUpload>
  setThumbnailUrl: (url: string | null) => void
}) {
  return useEntityMutation({
    createFn: createLibraryMedia,
    updateFn: updateLibraryMedia,
    deleteFn: deleteLibraryMedia,
    onSuccess: async ({ data }) => {
      const mediaId = (data as { media: { id: string } }).media.id
      await uploadThumbnailIfPresent(params.thumbUpload, mediaId)
      params.thumbUpload.clearFile()
      params.setThumbnailUrl(null)
      params.onOpenChange(false)
      params.onSuccess?.()
    },
  })
}

function useMediaDialogForm(params: {
  mode: MediaDialogMode
  media: MediaLibraryRow | undefined
  courseId: string | undefined
  uploads: ReturnType<typeof useMediaUploads>
  createMutation: { mutate: (args: { data: MediaSubmitPayload }) => void }
  updateMutation: {
    mutate: (args: { data: MediaSubmitPayload & { mediaId: string } }) => void
  }
}) {
  const { mode, media, courseId, uploads } = params
  return useAppForm({
    defaultValues: getInitialValues(media, mode, courseId),
    onSubmit: ({ value }) =>
      submitMediaForm({
        value,
        docUpload: uploads.docUpload,
        videoPick: uploads.videoPick,
        existingDocUrl: uploads.existingDocUrl,
        existingVideoUrl: uploads.existingVideoUrl,
        mode,
        media,
        courseId,
        createMutation: params.createMutation,
        updateMutation: params.updateMutation,
      }),
  })
}

function useMediaDialog(props: MediaDialogProps) {
  const { open, onOpenChange, mode, media, courseId, onSuccess } = props
  const uploads = useMediaUploads()
  const mutations = useMediaDialogMutations({
    onOpenChange,
    onSuccess,
    thumbUpload: uploads.thumbUpload,
    setThumbnailUrl: uploads.setThumbnailUrl,
  })
  const form = useMediaDialogForm({
    mode,
    media,
    courseId,
    uploads,
    createMutation: mutations.createMutation,
    updateMutation: mutations.updateMutation,
  })

  const clearDoc = uploads.docUpload.clearFile
  const clearVideo = uploads.videoPick.clearFile
  const clearThumb = uploads.thumbUpload.clearFile
  const setDocUrl = uploads.setExistingDocUrl
  const setVideoUrl = uploads.setExistingVideoUrl
  const setThumbUrl = uploads.setThumbnailUrl

  useEffect(() => {
    if (!open) return
    const reset = computeOpenResetState({ mode, media })
    setDocUrl(reset.existingDocUrl)
    setVideoUrl(reset.existingVideoUrl)
    setThumbUrl(reset.thumbnailUrl)
    clearDoc()
    clearVideo()
    clearThumb()
    form.reset(getInitialValues(media, mode, courseId))
  }, [
    open,
    media,
    mode,
    courseId,
    form,
    clearDoc,
    clearVideo,
    clearThumb,
    setDocUrl,
    setVideoUrl,
    setThumbUrl,
  ])

  return {
    uploads,
    form,
    deleteMutation: mutations.deleteMutation,
    isAnyPending: mutations.isAnyPending,
  }
}

function MediaDialogDelete(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  media: MediaLibraryRow | undefined
  deleteMutation: {
    mutate: (args: { data: { mediaId: string } }) => void
    isPending: boolean
  }
}) {
  return (
    <DeleteConfirmDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      entityName="Media"
      onConfirm={() => {
        if (!props.media) return
        props.deleteMutation.mutate({ data: { mediaId: props.media.id } })
      }}
      isDeleting={props.deleteMutation.isPending}
    />
  )
}

export function MediaDialog(props: MediaDialogProps) {
  const { open, onOpenChange, mode, media } = props
  const { uploads, form, deleteMutation, isAnyPending } = useMediaDialog(props)

  if (mode === 'delete') {
    return (
      <MediaDialogDelete
        open={open}
        onOpenChange={onOpenChange}
        media={media}
        deleteMutation={deleteMutation}
      />
    )
  }

  const chrome = getMediaDialogChrome(mode)
  const isUploading =
    uploads.docUpload.isUploading || uploads.videoPick.isUploading

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      title={chrome.title}
      subtitle={chrome.subtitle}
      maxWidth="3xl"
      onSubmit={() => form.handleSubmit()}
      isSubmitting={isMediaDialogSubmitting({
        isAnyPending,
        isDocUploading: uploads.docUpload.isUploading,
        isVideoUploading: uploads.videoPick.isUploading,
        isThumbUploading: uploads.thumbUpload.isUploading,
      })}
      submitLabel={chrome.submitLabel}
      loadingLabel={getMediaLoadingLabel(isUploading)}
    >
      <MediaFormFields
        form={form}
        docUpload={uploads.docUpload}
        videoPick={uploads.videoPick}
        thumbUpload={uploads.thumbUpload}
        existingDocUrl={uploads.existingDocUrl}
        existingVideoUrl={uploads.existingVideoUrl}
        thumbnailUrl={uploads.thumbnailUrl}
        mode={mode}
        onYoutubeSelected={uploads.onYoutubeSelected}
        onClearThumbnail={uploads.onClearThumbnail}
      />
    </FormDialog>
  )
}
