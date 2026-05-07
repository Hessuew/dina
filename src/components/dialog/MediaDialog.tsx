import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { MediaLibraryRow } from '@/utils/library'
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
} from '@/utils/library'
import { toUserError } from '@/utils/errors'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { useMutation } from '@/hooks/useMutation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { fileToBase64 } from '@/utils/imageUpload'

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

const dialogStyle = {
  backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
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
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<MediaFormData>({ ...emptyForm })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isUploading, setIsUploading] = useState(false)

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

      if (fileInputRef.current) fileInputRef.current.value = ''

      return
    }

    setFormData({ ...emptyForm })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [open, mode, media])

  const createMutation = useMutation({
    fn: createLibraryMedia,
    onSuccess: async () => {
      toast.success('Media created successfully!')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const updateMutation = useMutation({
    fn: updateLibraryMedia,
    onSuccess: async () => {
      toast.success('Media updated successfully!')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const deleteMutation = useMutation({
    fn: deleteLibraryMedia,
    onSuccess: async () => {
      toast.success('Media deleted successfully!')
      onOpenChange(false)
      await router.invalidate()
    },
  })

  const isPending =
    createMutation.status === 'pending' ||
    updateMutation.status === 'pending' ||
    deleteMutation.status === 'pending' ||
    isUploading

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
        setIsUploading(true)
        try {
          const result = await uploadMediaPdfFn({
            data: {
              fileData: await fileToBase64(formData.pdfFile),
              fileName: formData.pdfFile.name,
              fileType: formData.pdfFile.type,
              fileSize: formData.pdfFile.size,
            },
          })

          if (result.fileUrl) {
            url = result.fileUrl
            fileSize = formData.pdfFile.size
          }
        } catch (error) {
          toast.error(toUserError(error).message)
          setIsUploading(false)
          return
        }
        setIsUploading(false)
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
      setIsUploading(true)
      try {
        const result = await uploadMediaPdfFn({
          data: {
            fileData: await fileToBase64(formData.pdfFile),
            fileName: formData.pdfFile.name,
            fileType: formData.pdfFile.type,
            fileSize: formData.pdfFile.size,
            oldUrl: media?.fileUrl,
          },
        })

        if (result.fileUrl) {
          url = result.fileUrl
          fileSize = formData.pdfFile.size
        }
      } catch (error) {
        toast.error(toUserError(error).message)
        setIsUploading(false)
        return
      }
      setIsUploading(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-3xl"
        style={dialogStyle}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <div className="mb-1">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                {mode === 'create'
                  ? 'New media'
                  : mode === 'edit'
                    ? 'Edit media'
                    : 'Confirm action'}
              </div>
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              {mode === 'create'
                ? 'Create Media'
                : mode === 'edit'
                  ? 'Edit Media'
                  : 'Delete Media'}
            </DialogTitle>
            <DialogDescription className="text-[#AFA28F]">
              {mode === 'create'
                ? 'Add a new item to the library'
                : mode === 'edit'
                  ? 'Update this library item'
                  : `Are you sure you want to delete "${media?.title ?? ''}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {mode !== 'delete' && (
              <FieldGroup className="mt-6 gap-8">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field className="sm:col-span-2">
                    <FieldLabel
                      htmlFor="media-title"
                      className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                    >
                      Name <span className="text-[#C5A059]">*</span>
                    </FieldLabel>
                    <Input
                      id="media-title"
                      value={formData.title}
                      placeholder="Lesson recap video"
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

                  <Field>
                    <FieldLabel
                      htmlFor="media-category"
                      className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                    >
                      Category <span className="text-[#C5A059]">*</span>
                    </FieldLabel>
                    <Input
                      id="media-category"
                      value={formData.category}
                      placeholder="Foundations"
                      className={`rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50${fieldErrors.category ? 'border-red-500/60' : ''}`}
                      onChange={(e) => {
                        setFormData({ ...formData, category: e.target.value })
                        if (fieldErrors.category)
                          setFieldErrors({ ...fieldErrors, category: '' })
                      }}
                    />
                    {fieldErrors.category && (
                      <p className="text-[0.68rem] text-red-400">
                        {fieldErrors.category}
                      </p>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel
                      htmlFor="media-kind"
                      className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                    >
                      Type
                    </FieldLabel>
                    <Select
                      value={formData.kind}
                      onValueChange={(value) => {
                        const kind = value as MediaFormData['kind']
                        setFormData({
                          ...formData,
                          kind,
                          pdfFile: null,
                        })
                        if (fileInputRef.current)
                          fileInputRef.current.value = ''
                      }}
                    >
                      <SelectTrigger
                        className="w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]"
                        id="media-kind"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-white/12 bg-[#1C1A17]">
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel
                      htmlFor="media-url"
                      className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                    >
                      {formData.kind === 'youtube' ? 'YouTube URL' : 'PDF URL'}{' '}
                      <span className="text-[#C5A059]">*</span>
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
                      <p className="text-[0.68rem] text-red-400">
                        {fieldErrors.url}
                      </p>
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
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setFormData({ ...formData, pdfFile: file })
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
                          className="w-full rounded-none border-white/12 bg-white/6 text-[#AFA28F] hover:border-[#C5A059]/40 hover:bg-white/10"
                        >
                          <UploadIcon className="mr-2 size-4" />
                          Upload PDF
                        </Button>
                      )}

                      <p className="text-xs text-[#8E816D]">PDF. Max 25MB.</p>
                    </Field>
                  )}

                  <Field className="sm:col-span-2">
                    <FieldLabel
                      htmlFor="media-description"
                      className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                    >
                      Description
                    </FieldLabel>
                    <Textarea
                      id="media-description"
                      rows={6}
                      value={formData.description}
                      placeholder="Short summary for students"
                      className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </Field>

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
            )}
          </DialogBody>

          <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
            <Button
              variant="outline"
              theme="dark"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              theme="dark"
              variant={mode === 'delete' ? 'destructive' : 'default'}
              className="rounded-none"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isUploading
                ? 'Uploading...'
                : isPending
                  ? mode === 'create'
                    ? 'Creating...'
                    : mode === 'edit'
                      ? 'Saving...'
                      : 'Deleting...'
                  : mode === 'create'
                    ? 'Create'
                    : mode === 'edit'
                      ? 'Save Changes'
                      : 'Delete'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
