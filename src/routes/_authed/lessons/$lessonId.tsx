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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import {
  createAssignment,
  deleteAssignment,
  getAssignmentSubmissionCount,
  getLesson,
  updateAssignment,
} from '@/utils/assignments'
import { deleteLesson, updateLesson } from '@/utils/courses'

const getLessonData = createServerFn({ method: 'GET' })
  .inputValidator((d: { lessonId: string }) => d)
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

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditLessonDialog, setShowEditLessonDialog] = useState(false)
  const [showDeleteLessonDialog, setShowDeleteLessonDialog] = useState(false)
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
  const [lessonFormData, setLessonFormData] = useState({
    title: lesson.title,
    content: lesson.content || '',
    scheduledTime: lesson.scheduledTime
      ? new Date(lesson.scheduledTime).toISOString().slice(0, 16)
      : '',
    duration: lesson.duration?.toString() || '',
    isPublished: lesson.isPublished ?? false,
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

  const updateLessonMutation = useMutation({
    fn: updateLesson,
    onSuccess: async () => {
      toast.success('Lesson updated successfully!')
      setShowEditLessonDialog(false)
      await router.invalidate()
    },
  })

  const deleteLessonMutation = useMutation({
    fn: deleteLesson,
    onSuccess: async () => {
      toast.success('Lesson deleted successfully!')
      await router.navigate({
        to: '/courses/$courseId',
        params: { courseId: lesson.course.id },
      })
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

  const handleUpdateLesson = () => {
    if (!lessonFormData.title || !lessonFormData.scheduledTime) {
      toast.error('Title and scheduled time are required')
      return
    }

    updateLessonMutation.mutate({
      data: {
        lessonId: lesson.id,
        courseId: lesson.course.id,
        title: lessonFormData.title,
        content: lessonFormData.content || undefined,
        scheduledTime: new Date(lessonFormData.scheduledTime),
        duration: lessonFormData.duration
          ? parseInt(lessonFormData.duration)
          : undefined,
        isPublished: lessonFormData.isPublished,
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default'
      case 'closed':
        return 'destructive'
      default:
        return 'secondary'
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
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
            }}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{lesson.title}</h1>
              <p className="text-muted-foreground mt-1">
                {lesson.course.title} • By {lesson.course.teacher.fullName}
              </p>
            </div>
            {canEdit && (
              <Badge variant={isPublished ? 'default' : 'secondary'}>
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>Lesson Information</CardTitle>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setLessonFormData({
                            title: lesson.title,
                            content: lesson.content || '',
                            scheduledTime: lesson.scheduledTime
                              ? new Date(lesson.scheduledTime)
                                  .toISOString()
                                  .slice(0, 16)
                              : '',
                            duration: lesson.duration?.toString() || '',
                            isPublished: lesson.isPublished ?? false,
                          })
                          setShowEditLessonDialog(true)
                        }}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        className="hover:bg-destructive/10 hover:text-destructive"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteLessonDialog(true)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!showContent && (role as string) === 'student' ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <p>This lesson is not yet available</p>
                  </div>
                ) : (
                  <>
                    {lesson.content && (
                      <div>
                        <h3 className="mb-2 font-semibold">Description</h3>
                        <p className="text-muted-foreground text-sm">
                          {lesson.content}
                        </p>
                      </div>
                    )}
                    <div>
                      <h3 className="mb-2 font-semibold">Details</h3>
                      <div className="space-y-2 text-sm">
                        {lesson.duration && (
                          <div className="flex items-center gap-2">
                            <ClockIcon className="text-muted-foreground size-4" />
                            <span>{lesson.duration} minutes</span>
                          </div>
                        )}
                        {lesson.scheduledTime && (
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="text-muted-foreground size-4" />
                            <span>
                              {new Date(
                                lesson.scheduledTime,
                              ).toLocaleDateString()}{' '}
                              at{' '}
                              {new Date(
                                lesson.scheduledTime,
                              ).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Assignments</CardTitle>
                    <CardDescription>
                      {lesson.assignments.length} assignment
                      {lesson.assignments.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                      <PlusIcon className="mr-2 size-4" />
                      Add Assignment
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {lesson.assignments.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <p className="mb-4">No assignments yet</p>
                    {canEdit && (
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <PlusIcon className="mr-2 size-4" />
                        Create Your First Assignment
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lesson.assignments
                      .filter((a: Assignment) =>
                        role === 'student' ? a.status === 'published' : true,
                      )
                      .map((assignment: Assignment) => (
                        <div
                          key={assignment.id}
                          className="hover:bg-muted/50 flex items-start justify-between rounded-lg border p-4 transition-colors"
                        >
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() =>
                              router.navigate({
                                to: '/assignments/$assignmentId',
                                params: {
                                  assignmentId: assignment.id,
                                },
                                search: {
                                  calendarMonth: undefined,
                                  fromCalendar: false,
                                  fromDashboard: false,
                                },
                              })
                            }
                          >
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                {assignment.title}
                              </h4>
                              <Badge
                                variant={getStatusBadgeVariant(
                                  assignment.status,
                                )}
                              >
                                {getStatusLabel(assignment.status)}
                              </Badge>
                            </div>
                            {assignment.description && (
                              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                                {assignment.description}
                              </p>
                            )}
                            <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="size-3" />
                                <span>
                                  Due{' '}
                                  {new Date(
                                    assignment.dueDate,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <span>
                                Max: {assignment.maxGrade ?? 100} points
                              </span>
                            </div>
                          </div>
                          {canEdit && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditAssignment(assignment)
                                }}
                              >
                                <PencilIcon className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteAssignmentClick(assignment)
                                }}
                              >
                                <TrashIcon className="size-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>
              Add a new assignment for this lesson
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
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
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                placeholder="Assignment description"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
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
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>Update assignment details</DialogDescription>
          </DialogHeader>
          <FieldGroup>
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
              <FieldLabel htmlFor="editDescription">Description</FieldLabel>
              <Textarea
                id="editDescription"
                placeholder="Assignment description"
                rows={3}
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
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
                  setEditFormData({ ...editFormData, dueDate: e.target.value })
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
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
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

      {/* Edit Lesson Dialog */}
      <Dialog
        open={showEditLessonDialog}
        onOpenChange={setShowEditLessonDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>Update the lesson information</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="lesson-title">
                Title <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="lesson-title"
                placeholder="Lesson title"
                value={lessonFormData.title}
                onChange={(e) =>
                  setLessonFormData({
                    ...lessonFormData,
                    title: e.target.value,
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lesson-content">Content</FieldLabel>
              <Textarea
                id="lesson-content"
                placeholder="Lesson content or description"
                rows={3}
                value={lessonFormData.content}
                onChange={(e) =>
                  setLessonFormData({
                    ...lessonFormData,
                    content: e.target.value,
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lesson-duration">
                Duration (minutes)
              </FieldLabel>
              <Input
                id="lesson-duration"
                type="number"
                placeholder="60"
                value={lessonFormData.duration}
                onChange={(e) =>
                  setLessonFormData({
                    ...lessonFormData,
                    duration: e.target.value,
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lesson-time">
                Scheduled Time <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="lesson-time"
                type="datetime-local"
                value={lessonFormData.scheduledTime}
                onChange={(e) =>
                  setLessonFormData({
                    ...lessonFormData,
                    scheduledTime: e.target.value,
                  })
                }
              />
            </Field>
            <Field>
              <div className="flex items-center gap-2">
                <Switch
                  id="lesson-published"
                  checked={lessonFormData.isPublished}
                  onCheckedChange={(checked) =>
                    setLessonFormData({
                      ...lessonFormData,
                      isPublished: checked,
                    })
                  }
                />
                <FieldLabel htmlFor="lesson-published">
                  Publish lesson
                </FieldLabel>
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditLessonDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLesson}
              disabled={updateLessonMutation.status === 'pending'}
            >
              {updateLessonMutation.status === 'pending'
                ? 'Saving...'
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Dialog */}
      <Dialog
        open={showDeleteLessonDialog}
        onOpenChange={setShowDeleteLessonDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lesson? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteLessonDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteLessonMutation.mutate({
                  data: {
                    lessonId: lesson.id,
                    courseId: lesson.course.id,
                  },
                })
              }}
              disabled={deleteLessonMutation.status === 'pending'}
            >
              {deleteLessonMutation.status === 'pending'
                ? 'Deleting...'
                : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
