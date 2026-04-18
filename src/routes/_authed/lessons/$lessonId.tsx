import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  CalendarIcon,
  ChevronLeft,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import z from 'zod'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
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
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@/hooks/useMutation'
import {
  createAssignment,
  deleteAssignment,
  getAssignmentSubmissionCount,
  getLesson,
  updateAssignment,
} from '@/utils/assignments'
import { LessonDialog } from '@/components/dialog/LessonDialog'
import { cn } from '@/lib/utils'

const getLessonData = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ lessonId: z.uuid() }))
  .handler(async ({ data }) => {
    return await getLesson({ data })
  })

type LessonSearch = {
  fromCalendar?: boolean
  calendarMonth?: string
}

export const Route = createFileRoute('/_authed/lessons/$lessonId')({
  validateSearch: (search: Record<string, unknown>): LessonSearch => {
    return {
      fromCalendar: search.fromCalendar as boolean | undefined,
      calendarMonth: search.calendarMonth as string | undefined,
    }
  },
  loader: async ({ params }) => {
    const data = await getLessonData({ data: { lessonId: params.lessonId } })
    return data
  },
  component: LessonDetailComponent,
})

type Assignment = {
  id: string
  title: string
  description: string | null
  dueDate: Date
  maxGrade: number | null
  status: 'draft' | 'published' | 'closed'
  createdAt: Date
  updatedAt: Date
}

function LessonDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const search = Route.useSearch()
  const { lesson, role } = loaderData

  const [lessonDialogMode, setLessonDialogMode] = useState<
    'edit' | 'delete' | null
  >(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditAssignmentDialog, setShowEditAssignmentDialog] =
    useState(false)
  const [showDeleteAssignmentDialog, setShowDeleteAssignmentDialog] =
    useState(false)
  const [assignmentToEdit, setAssignmentToEdit] = useState<Assignment | null>(
    null,
  )
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<Assignment | null>(null)
  const [submissionCount, setSubmissionCount] = useState(0)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxGrade: 100,
  })
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxGrade: 100,
    status: 'draft' as 'draft' | 'published' | 'closed',
  })
  const canEdit = role === 'teacher' || role === 'admin'
  const isPublished = lesson.isPublished ?? false
  const showContent = isPublished || canEdit

  const createAssignmentMutation = useMutation({
    fn: createAssignment,
    onSuccess: async () => {
      toast.success('Assignment created successfully!')
      setShowCreateDialog(false)
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        maxGrade: 100,
      })
      await router.invalidate()
    },
  })

  const deleteAssignmentMutation = useMutation({
    fn: deleteAssignment,
    onSuccess: async () => {
      toast.success('Assignment deleted successfully!')
      setAssignmentToDelete(null)
      setShowDeleteAssignmentDialog(false)
      await router.invalidate()
    },
  })

  const updateAssignmentMutation = useMutation({
    fn: updateAssignment,
    onSuccess: async () => {
      toast.success('Assignment updated successfully!')
      setShowEditAssignmentDialog(false)
      setAssignmentToEdit(null)
      await router.invalidate()
    },
  })

  const handleCreateAssignment = () => {
    if (!formData.title || !formData.dueDate) {
      toast.error('Title and due date are required')
      return
    }

    createAssignmentMutation.mutate({
      data: {
        lessonId: lesson.id,
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        maxGrade: formData.maxGrade,
      },
    })
  }

  const handleEditAssignment = (assignment: Assignment) => {
    setAssignmentToEdit(assignment)
    setEditFormData({
      title: assignment.title,
      description: assignment.description || '',
      dueDate: new Date(assignment.dueDate).toISOString().slice(0, 16),
      maxGrade: assignment.maxGrade ?? 100,
      status: assignment.status,
    })
    setShowEditAssignmentDialog(true)
  }

  const handleUpdateAssignment = () => {
    if (!assignmentToEdit || !editFormData.title || !editFormData.dueDate) {
      toast.error('Title and due date are required')
      return
    }

    updateAssignmentMutation.mutate({
      data: {
        assignmentId: assignmentToEdit.id,
        title: editFormData.title,
        description: editFormData.description,
        dueDate: editFormData.dueDate,
        maxGrade: editFormData.maxGrade,
        status: editFormData.status,
      },
    })
  }

  const handleDeleteAssignmentClick = async (assignment: Assignment) => {
    setAssignmentToDelete(assignment)

    try {
      const result = await getAssignmentSubmissionCount({
        data: { assignmentId: assignment.id },
      })
      setSubmissionCount(result.count)
      setShowDeleteAssignmentDialog(true)
    } catch (error: any) {
      toast.error(error.message || 'Failed to check submissions')
    }
  }

  const handleConfirmDeleteAssignment = () => {
    if (!assignmentToDelete) return

    deleteAssignmentMutation.mutate({
      data: { assignmentId: assignmentToDelete.id },
    })
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published':
        return 'Published'
      case 'closed':
        return 'Closed'
      default:
        return 'Draft'
    }
  }

  const goBack = () => {
    if (search.fromCalendar && search.calendarMonth) {
      router.navigate({
        to: '/calendar',
        search: { month: search.calendarMonth },
      })
    } else {
      router.navigate({
        to: '/courses/$courseId',
        params: { courseId: lesson.course.id },
      })
    }
  }

  return (
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
        {/* Page header */}
        <div className="mb-10">
          <button
            type="button"
            onClick={goBack}
            className="mb-6 flex items-center gap-2 text-[0.72rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase transition-colors hover:text-[#C5A059]"
          >
            <ChevronLeft className="size-3.5" />
            {lesson.course.title}
          </button>

          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="h-px w-10 bg-[#C5A059]/50" />
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
                {lesson.title}
              </h1>
              <div className="mt-3 flex items-center gap-4 text-[0.68rem] text-[#9B8C7C]">
                {lesson.scheduledTime && (
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="size-3" />
                    <span>
                      {new Date(lesson.scheduledTime).toLocaleDateString(
                        'en-US',
                        {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      )}{' '}
                      at{' '}
                      {new Date(lesson.scheduledTime).toLocaleTimeString(
                        'en-US',
                        {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        },
                      )}
                    </span>
                  </div>
                )}
                {lesson.duration && (
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="size-3" />
                    <span>{lesson.duration} min</span>
                  </div>
                )}
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-3 pt-4">
                <div
                  className={cn(
                    'border px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.22em] uppercase',
                    isPublished
                      ? 'border-[#C5A059]/40 bg-[#C5A059]/8 text-[#9B7A41]'
                      : 'border-[#1A1A1A]/12 bg-[#1A1A1A]/4 text-[#8E816D]',
                  )}
                >
                  {isPublished ? 'Published' : 'Draft'}
                </div>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] transition-all hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
                  onClick={() => setLessonDialogMode('edit')}
                >
                  <PencilIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="flex size-8 items-center justify-center border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] transition-all hover:border-red-300 hover:text-red-600"
                  onClick={() => setLessonDialogMode('delete')}
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Left — lesson content */}
          <div className="border border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.10)]">
            <div className="px-6 py-6">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                Lesson Content
              </div>
              {!showContent ? (
                <div className="mt-8 text-center">
                  <p className="text-sm text-[#9B8C7C] italic">
                    This lesson is not yet available.
                  </p>
                </div>
              ) : lesson.content ? (
                <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#4E463D]">
                  {lesson.content}
                </p>
              ) : (
                <p className="mt-4 text-sm text-[#9B8C7C] italic">
                  No content provided.
                </p>
              )}
            </div>
          </div>

          {/* Right — assignments */}
          <div className="border border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.10)]">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/8 px-6 py-5">
              <div>
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  Assignments
                </div>
                <div className="mt-1 font-serif text-xl text-[#1C1815]">
                  {lesson.assignments.length}{' '}
                  {lesson.assignments.length === 1
                    ? 'Assignment'
                    : 'Assignments'}
                </div>
              </div>
              {canEdit && (
                <Button theme="light" onClick={() => setShowCreateDialog(true)}>
                  <PlusIcon className="size-3.5" />
                  Add Assignment
                </Button>
              )}
            </div>

            {lesson.assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-[#8E816D]">No assignments yet</p>
                {canEdit && (
                  <Button
                    theme="light"
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <PlusIcon className="size-3.5" />
                    Create First Assignment
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#1A1A1A]/6">
                {lesson.assignments
                  .filter((a: Assignment) =>
                    role === 'student' ? a.status === 'published' : true,
                  )
                  .map((assignment: Assignment) => {
                    const statusColors = {
                      published: 'border-[#C5A059]/40 text-[#9B7A41]',
                      closed: 'border-red-300 text-red-500',
                      draft: 'border-[#1A1A1A]/12 text-[#8E816D]',
                    }
                    return (
                      <div
                        key={assignment.id}
                        className="group flex items-start gap-4 px-6 py-5 transition-all hover:bg-[#EDE8DE]/60"
                      >
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() =>
                            router.navigate({
                              to: '/assignments/$assignmentId',
                              params: { assignmentId: assignment.id },
                              search: {
                                calendarMonth: undefined,
                                fromCalendar: false,
                                fromDashboard: false,
                              },
                            })
                          }
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-serif text-base text-[#1C1815] group-hover:text-[#9B7A41]">
                              {assignment.title}
                            </span>
                            <span
                              className={cn(
                                'border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase',
                                statusColors[assignment.status] ??
                                  statusColors.draft,
                              )}
                            >
                              {getStatusLabel(assignment.status)}
                            </span>
                          </div>
                          {assignment.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-[#6B5F4D]">
                              {assignment.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-[0.68rem] text-[#9B8C7C]">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="size-3" />
                              <span>
                                Due{' '}
                                {new Date(
                                  assignment.dueDate,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <span>Max: {assignment.maxGrade ?? 100} pts</span>
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center border border-[#1A1A1A]/10 text-[#8E816D] transition-all hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
                              onClick={() => handleEditAssignment(assignment)}
                            >
                              <PencilIcon className="size-3" />
                            </button>
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center border border-[#1A1A1A]/10 text-[#8E816D] transition-all hover:border-red-300 hover:text-red-500"
                              onClick={() =>
                                handleDeleteAssignmentClick(assignment)
                              }
                            >
                              <TrashIcon className="size-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Assignment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent
          className="rounded-none border border-[#C5A059]/20 sm:max-w-3xl"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#1C1815]">
              Create Assignment
            </DialogTitle>
            <DialogDescription className="text-[#4E463D]">
              Add a new assignment for this lesson
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="title"
                  placeholder="Assignment title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="dueDate">
                  Due Date <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="maxGrade">Maximum Grade</FieldLabel>
                <Input
                  id="maxGrade"
                  type="number"
                  value={formData.maxGrade}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxGrade: parseInt(e.target.value) || 100,
                    })
                  }
                />
              </Field>
            </div>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                placeholder="Assignment description"
                rows={8}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAssignment}
              disabled={createAssignmentMutation.status === 'pending'}
            >
              {createAssignmentMutation.status === 'pending'
                ? 'Creating...'
                : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog
        open={showEditAssignmentDialog}
        onOpenChange={setShowEditAssignmentDialog}
      >
        <DialogContent
          className="rounded-none border border-[#C5A059]/20 sm:max-w-3xl"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#1C1815]">
              Edit Assignment
            </DialogTitle>
            <DialogDescription className="text-[#4E463D]">
              Update assignment details
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="editTitle">
                  Title <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="editTitle"
                  placeholder="Assignment title"
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="editDueDate">
                  Due Date <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="editDueDate"
                  type="datetime-local"
                  value={editFormData.dueDate}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      dueDate: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="editMaxGrade">Maximum Grade</FieldLabel>
                <Input
                  id="editMaxGrade"
                  type="number"
                  value={editFormData.maxGrade}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      maxGrade: parseInt(e.target.value) || 100,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="editStatus">Status</FieldLabel>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) =>
                    setEditFormData({
                      ...editFormData,
                      status: value as 'draft' | 'published' | 'closed',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="editDescription">Description</FieldLabel>
              <Textarea
                id="editDescription"
                placeholder="Assignment description"
                rows={8}
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => {
                setShowEditAssignmentDialog(false)
                setAssignmentToEdit(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAssignment}
              disabled={updateAssignmentMutation.status === 'pending'}
            >
              {updateAssignmentMutation.status === 'pending'
                ? 'Updating...'
                : 'Update Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Dialog */}
      <Dialog
        open={showDeleteAssignmentDialog}
        onOpenChange={setShowDeleteAssignmentDialog}
      >
        <DialogContent
          className="rounded-none border border-[#C5A059]/20"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#1C1815]">
              Delete Assignment
            </DialogTitle>
            <DialogDescription className="text-[#4E463D]">
              {submissionCount > 0 ? (
                <>
                  This assignment has {submissionCount} submission
                  {submissionCount !== 1 ? 's' : ''}. Assignments with
                  submissions cannot be deleted.
                </>
              ) : (
                <>
                  Are you sure you want to delete "{assignmentToDelete?.title}"?
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => {
                setShowDeleteAssignmentDialog(false)
                setAssignmentToDelete(null)
                setSubmissionCount(0)
              }}
            >
              Cancel
            </Button>
            {submissionCount === 0 && (
              <Button
                variant="destructive"
                className="rounded-none"
                onClick={handleConfirmDeleteAssignment}
                disabled={deleteAssignmentMutation.status === 'pending'}
              >
                {deleteAssignmentMutation.status === 'pending'
                  ? 'Deleting...'
                  : 'Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog (edit / delete) */}
      {lessonDialogMode !== null && (
        <LessonDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setLessonDialogMode(null)
          }}
          mode={lessonDialogMode}
          courseId={lesson.course.id}
          initialData={{
            lessonId: lesson.id,
            title: lesson.title,
            content: lesson.content,
            scheduledTime: lesson.scheduledTime
              ? new Date(lesson.scheduledTime)
              : null,
            duration: lesson.duration,
            isPublished: lesson.isPublished ?? false,
            orderIndex: lesson.orderIndex ?? 0,
          }}
        />
      )}
    </div>
  )
}
