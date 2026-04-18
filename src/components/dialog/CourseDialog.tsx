import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { UploadIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
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
import { useMutation } from '@/hooks/useMutation'
import { useAllTeachers } from '@/hooks/useAllTeachers'
import { createCourse, updateCourse } from '@/utils/courses'
import { fileToBase64, uploadCourseThumbnailFn } from '@/utils/imageUpload'
import marbleTexture from '@/assets/images/bg/bg_hero.webp'

type CourseFormData = {
  title: string
  description: string
  thumbnailUrl: string | null
  thumbnailFile: File | null
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
  thumbnailFile: null,
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
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [formData, setFormData] = useState<CourseFormData>({ ...emptyFormData })

  useEffect(() => {
    if (open) {
      setFormData(
        initialData
          ? {
              title: initialData.title,
              description: initialData.description,
              thumbnailUrl: initialData.thumbnailUrl,
              thumbnailFile: null,
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
            thumbnailFile: null,
            teacher1Id: initialData.teacher1Id,
            teacher2Id: initialData.teacher2Id,
            orderIndex: initialData.orderIndex,
            isPublished: initialData.isPublished,
          }
        : { ...emptyFormData },
    )
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleThumbnailUpload = async (courseId: string) => {
    if (!formData.thumbnailFile) return
    setIsUploading(true)
    try {
      const result = await uploadCourseThumbnailFn({
        data: {
          fileData: await fileToBase64(formData.thumbnailFile),
          fileName: formData.thumbnailFile.name,
          fileType: formData.thumbnailFile.type,
          fileSize: formData.thumbnailFile.size,
          courseId,
        },
      })
      if ('error' in result && result.error) {
        toast.error(result.message || 'Failed to upload thumbnail')
      }
    } catch (error) {
      console.error('Thumbnail upload error:', error)
      toast.error('Failed to upload thumbnail')
    }
    setIsUploading(false)
  }

  const createMutation = useMutation({
    fn: createCourse,
    onSuccess: async (ctx) => {
      if ('course' in ctx.data) {
        await handleThumbnailUpload(ctx.data.course.id)
        toast.success('Course created successfully!')
        onOpenChange(false)
        resetForm()
        await router.invalidate()
      }
    },
  })

  const updateMutation = useMutation({
    fn: updateCourse,
    onSuccess: async (ctx) => {
      if ('course' in ctx.data) {
        await handleThumbnailUpload(ctx.data.course.id)
        toast.success('Course updated successfully!')
        onOpenChange(false)
        resetForm()
        await router.invalidate()
      }
    },
  })

  const mutation = mode === 'create' ? createMutation : updateMutation
  const isPending = mutation.status === 'pending' || isUploading

  const handleSubmit = () => {
    if (!formData.title) {
      toast.error('Title is required')
      return
    }

    if (isAdmin && formData.teacher1Id && formData.teacher2Id) {
      if (formData.teacher1Id === formData.teacher2Id) {
        toast.error('Please select 2 different teachers')
        return
      }
    }

    if (mode === 'create') {
      createMutation.mutate({
        data: {
          title: formData.title,
          description: formData.description,
          teacher1Id: formData.teacher1Id as string,
          teacher2Id: formData.teacher2Id as string,
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }
    const fileData = await fileToBase64(file)
    setFormData({ ...formData, thumbnailUrl: fileData, thumbnailFile: file })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-y-auto rounded-none border border-[#C5A059]/20 text-[#1C1815] shadow-[0_28px_60px_-32px_rgba(0,0,0,0.22)] sm:max-w-3xl"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(247,244,238,0.97), rgba(247,244,238,0.99)), url(${marbleTexture})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.08),transparent_40%)]" />

        <div className="relative">
          <DialogHeader>
            <div className="mb-1">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                {mode === 'create' ? 'New course' : 'Edit course'}
              </div>
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#1C1815]">
              {mode === 'create' ? 'Create Course' : 'Edit Course'}
            </DialogTitle>
            <DialogDescription className="text-[#4E463D]">
              {mode === 'create'
                ? 'Add a new course and assign teachers'
                : 'Update the course information'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="mt-6 gap-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field className="sm:col-span-2">
                <FieldLabel
                  htmlFor="course-title"
                  className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                >
                  Title <span className="text-[#C5A059]">*</span>
                </FieldLabel>
                <Input
                  id="course-title"
                  placeholder="Introduction to Programming"
                  value={formData.title}
                  className="rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815] placeholder:text-[#9B8C7C] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </Field>
              <div className="sm:col-span-1" />
              <Field>
                <FieldLabel
                  htmlFor="course-orderIndex"
                  className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                >
                  Order Index
                </FieldLabel>
                <Input
                  id="course-orderIndex"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.orderIndex}
                  className="rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815] placeholder:text-[#9B8C7C] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      orderIndex: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-[#6B5F4D]">
                  Lower numbers appear first in course list
                </p>
              </Field>
              {isAdmin && (
                <>
                  <Field>
                    <FieldLabel
                      htmlFor="course-teacher1"
                      className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                    >
                      Teacher 1 <span className="text-[#C5A059]">*</span>
                    </FieldLabel>
                    <Select
                      value={formData.teacher1Id ?? undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, teacher1Id: value })
                      }
                    >
                      <SelectTrigger
                        className="w-full rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815]"
                        id="course-teacher1"
                      >
                        <SelectValue placeholder="Select first teacher">
                          {formData.teacher1Id
                            ? teachers.find((t) => t.id === formData.teacher1Id)
                                ?.fullName || 'Select first teacher'
                            : 'Select first teacher'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-[#1A1A1A]/12 bg-[#FDFAF5]">
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
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel
                      htmlFor="course-teacher2"
                      className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                    >
                      Teacher 2 <span className="text-[#C5A059]">*</span>
                    </FieldLabel>
                    <Select
                      value={formData.teacher2Id ?? undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, teacher2Id: value })
                      }
                    >
                      <SelectTrigger
                        className="w-full rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815]"
                        id="course-teacher2"
                      >
                        <SelectValue placeholder="Select second teacher">
                          {formData.teacher2Id
                            ? teachers.find((t) => t.id === formData.teacher2Id)
                                ?.fullName || 'Select second teacher'
                            : 'Select second teacher'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-[#1A1A1A]/12 bg-[#FDFAF5]">
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
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel
                  htmlFor="course-description"
                  className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                >
                  Description
                </FieldLabel>
                <Textarea
                  id="course-description"
                  placeholder="Describe what students will learn in this course"
                  rows={10}
                  value={formData.description}
                  className="rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815] placeholder:text-[#9B8C7C] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </Field>
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
                  {formData.thumbnailUrl ? (
                    <div className="relative aspect-video w-full max-w-sm overflow-hidden border border-white/10">
                      <img
                        src={formData.thumbnailUrl}
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
                            thumbnailFile: null,
                          })
                          if (fileInputRef.current)
                            fileInputRef.current.value = ''
                        }}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full max-w-sm rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#4E463D] hover:border-[#C5A059]/40 hover:bg-white"
                    >
                      <UploadIcon className="mr-2 size-4" />
                      Upload Thumbnail
                    </Button>
                  )}
                  <p className="text-xs text-[#6B5F4D]">
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
                    className="text-sm text-[#4E463D]"
                  >
                    Publish course
                  </FieldLabel>
                </div>
              </Field>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6 rounded-none border-[#C5A059]/15 bg-[#F0EBE1]/60">
            <Button
              variant="outline"
              className="rounded-none border-[#1A1A1A]/12 bg-transparent text-[#6B5F4D] hover:border-[#1A1A1A]/20 hover:bg-white/50 hover:text-[#1C1815]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button theme="light" onClick={handleSubmit} disabled={isPending}>
              {isUploading
                ? 'Uploading...'
                : isPending
                  ? mode === 'create'
                    ? 'Creating...'
                    : 'Saving...'
                  : mode === 'create'
                    ? 'Create Course'
                    : 'Save Changes'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
