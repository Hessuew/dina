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
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'

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
        className="overflow-y-auto rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-3xl"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />

        <div className="relative">
          <DialogHeader>
            <div className="mb-1">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                {mode === 'create' ? 'New course' : 'Edit course'}
              </div>
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              {mode === 'create' ? 'Create Course' : 'Edit Course'}
            </DialogTitle>
            <DialogDescription className="text-[#AFA28F]">
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
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
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
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      orderIndex: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-[#8E816D]">
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
                        className="w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]"
                        id="course-teacher1"
                      >
                        <SelectValue placeholder="Select first teacher">
                          {formData.teacher1Id
                            ? teachers.find((t) => t.id === formData.teacher1Id)
                                ?.fullName || 'Select first teacher'
                            : 'Select first teacher'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-white/12 bg-[#1C1A17]">
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
                        className="w-full rounded-none border-white/12 bg-white/6 text-[#F8F4EC]"
                        id="course-teacher2"
                      >
                        <SelectValue placeholder="Select second teacher">
                          {formData.teacher2Id
                            ? teachers.find((t) => t.id === formData.teacher2Id)
                                ?.fullName || 'Select second teacher'
                            : 'Select second teacher'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-white/12 bg-[#1C1A17]">
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
                  className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
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
                    className="text-sm text-[#AFA28F]"
                  >
                    Publish course
                  </FieldLabel>
                </div>
              </Field>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6 rounded-none border-white/8 bg-white/3">
            <Button
              variant="outline"
              theme="dark"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button theme="dark" onClick={handleSubmit} disabled={isPending}>
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
