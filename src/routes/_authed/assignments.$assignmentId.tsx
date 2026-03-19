import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  ArrowLeftIcon,
  CalendarIcon,
  PencilIcon,
  SaveIcon,
  SendIcon,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useMutation } from '@/hooks/useMutation'
import {
  createOrUpdateSubmission,
  deleteAssignment,
  getAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
  updateAssignment,
} from '@/utils/assignments'

const getAssignmentData = createServerFn({ method: 'GET' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    return await getAssignment({ data })
  })

const getSubmissionsData = createServerFn({ method: 'GET' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    return await getAssignmentSubmissions({ data })
  })

export const Route = createFileRoute('/_authed/assignments/$assignmentId')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      fromDashboard: search.fromDashboard === true,
      activeTab: (search.activeTab as string) || undefined,
    }
  },
  loader: async ({ params }) => {
    const assignmentData = await getAssignmentData({
      data: { assignmentId: params.assignmentId },
    })

    if (assignmentData.role === 'teacher' || assignmentData.role === 'admin') {
      const submissionsData = await getSubmissionsData({
        data: { assignmentId: params.assignmentId },
      })

      return {
        ...assignmentData,
        allSubmissions: submissionsData.submissions,
      }
    }

    const submissionsData = { submissions: [] } as any
    return {
      ...assignmentData,
      allSubmissions: submissionsData.submissions,
    }
  },
  component: AssignmentDetailComponent,
})

type SubmissionWithStudent = {
  id: string
  content: string | null
  fileUrl: string | null
  status: 'draft' | 'submitted' | 'graded'
  grade: number | null
  feedback: string | null
  submittedAt: Date | null
  gradedAt: Date | null
  student: {
    id: string
    fullName: string
    email: string
  }
}

function AssignmentDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const { fromDashboard, activeTab } = Route.useSearch()
  const { assignment, submission, role, allSubmissions } = loaderData

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showGradingDialog, setShowGradingDialog] = useState(false)
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithStudent | null>(null)

  const [assignmentFormData, setAssignmentFormData] = useState({
    title: assignment.title,
    description: assignment.description || '',
    dueDate: new Date(assignment.dueDate).toISOString().slice(0, 16),
    maxGrade: assignment.maxGrade ?? 100,
    status: assignment.status,
  })

  const [submissionFormData, setSubmissionFormData] = useState({
    content: submission?.content || '',
    fileUrl: submission?.fileUrl || '',
  })

  const [gradingFormData, setGradingFormData] = useState({
    grade: 0,
    feedback: '',
  })

  const canEdit = role === 'teacher' || role === 'admin'
  const isStudent = role === 'student'
  const canSubmit =
    isStudent &&
    assignment.status === 'published' &&
    new Date(assignment.dueDate) > new Date()

  const updateAssignmentMutation = useMutation({
    fn: updateAssignment,
    onSuccess: async () => {
      toast.success('Assignment updated successfully!')
      setShowEditDialog(false)
      await router.invalidate()
    },
  })

  const deleteAssignmentMutation = useMutation({
    fn: deleteAssignment,
    onSuccess: async () => {
      toast.success('Assignment deleted successfully!')
      if (fromDashboard) {
        await router.navigate({
          to: '/dashboard',
          search: activeTab ? { activeTab } : undefined,
        })
      } else {
        await router.navigate({
          to: '/lessons/$lessonId',
          params: { lessonId: assignment.lesson.id },
        })
      }
    },
  })

  const submissionMutation = useMutation({
    fn: createOrUpdateSubmission,
    onSuccess: async () => {
      toast.success('Submission saved successfully!')
      await router.invalidate()
    },
  })

  const gradingMutation = useMutation({
    fn: gradeSubmission,
    onSuccess: async () => {
      toast.success('Submission graded successfully!')
      setShowGradingDialog(false)
      setSelectedSubmission(null)
      await router.invalidate()
    },
  })

  const handleUpdateAssignment = () => {
    if (!assignmentFormData.title || !assignmentFormData.dueDate) {
      toast.error('Title and due date are required')
      return
    }

    updateAssignmentMutation.mutate({
      data: {
        assignmentId: assignment.id,
        title: assignmentFormData.title,
        description: assignmentFormData.description,
        dueDate: assignmentFormData.dueDate,
        maxGrade: assignmentFormData.maxGrade,
        status: assignmentFormData.status,
      },
    })
  }

  const handleSaveSubmission = (submit: boolean = false) => {
    submissionMutation.mutate({
      data: {
        assignmentId: assignment.id,
        content: submissionFormData.content,
        fileUrl: submissionFormData.fileUrl,
        submit,
      },
    })
  }

  const handleGradeSubmission = () => {
    if (!selectedSubmission) return

    gradingMutation.mutate({
      data: {
        submissionId: selectedSubmission.id,
        assignmentId: assignment.id,
        grade: gradingFormData.grade,
        feedback: gradingFormData.feedback,
      },
    })
  }

  const handleOpenGradingModal = (submissionToGrade: SubmissionWithStudent) => {
    setSelectedSubmission(submissionToGrade)
    setGradingFormData({
      grade: submissionToGrade.grade ?? 0,
      feedback: submissionToGrade.feedback ?? '',
    })
    setShowGradingDialog(true)
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

  const isPastDue = new Date(assignment.dueDate) < new Date()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.history.back()}
            className="mb-2"
          >
            <ArrowLeftIcon className="mr-2 size-4" />
            {fromDashboard ? 'Back to Dashboard' : 'Back to Lesson'}
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{assignment.title}</h1>
              <p className="text-muted-foreground mt-1">
                {assignment.lesson.title} • {assignment.lesson.course.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(assignment.status)}>
                {getStatusLabel(assignment.status)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>Assignment Details</CardTitle>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setAssignmentFormData({
                            title: assignment.title,
                            description: assignment.description || '',
                            dueDate: new Date(assignment.dueDate)
                              .toISOString()
                              .slice(0, 16),
                            maxGrade: assignment.maxGrade ?? 100,
                            status: assignment.status,
                          })
                          setShowEditDialog(true)
                        }}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        className="hover:bg-destructive/10 hover:text-destructive"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignment.description && (
                  <div>
                    <h3 className="mb-2 font-semibold">Description</h3>
                    <p className="text-muted-foreground text-sm">
                      {assignment.description}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="mb-2 font-semibold">Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Due Date</span>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="size-4" />
                        <span>
                          {new Date(assignment.dueDate).toLocaleDateString()} at{' '}
                          {new Date(assignment.dueDate).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Maximum Grade
                      </span>
                      <span className="font-medium">
                        {assignment.maxGrade ?? 100} points
                      </span>
                    </div>
                    {isPastDue && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        This assignment is past due
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {isStudent ? 'Your Submission' : 'Submissions'}
                </CardTitle>
                <CardDescription>
                  {isStudent
                    ? canSubmit
                      ? 'Submit your work before the due date'
                      : isPastDue
                        ? 'Submission period has ended'
                        : 'Assignment not yet open for submissions'
                    : 'Student submissions will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isStudent ? (
                  <div className="space-y-4">
                    {assignment.status !== 'published' ? (
                      <div className="text-muted-foreground py-8 text-center">
                        <p>This assignment is not yet available</p>
                      </div>
                    ) : (
                      <>
                        <Field>
                          <FieldLabel htmlFor="content">Your Answer</FieldLabel>
                          <Textarea
                            id="content"
                            rows={8}
                            placeholder="Enter your answer here..."
                            value={submissionFormData.content}
                            onChange={(e) =>
                              setSubmissionFormData({
                                ...submissionFormData,
                                content: e.target.value,
                              })
                            }
                            disabled={!canSubmit}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="fileUrl">
                            File URL (Optional)
                          </FieldLabel>
                          <Input
                            id="fileUrl"
                            type="url"
                            placeholder="https://..."
                            value={submissionFormData.fileUrl}
                            onChange={(e) =>
                              setSubmissionFormData({
                                ...submissionFormData,
                                fileUrl: e.target.value,
                              })
                            }
                            disabled={!canSubmit}
                          />
                        </Field>
                        {submission && (
                          <div className="rounded-md bg-muted p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Status
                              </span>
                              <Badge
                                variant={
                                  submission.status === 'submitted'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {submission.status === 'submitted'
                                  ? 'Submitted'
                                  : 'Draft'}
                              </Badge>
                            </div>
                            {submission.submittedAt && (
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Submitted
                                </span>
                                <span>
                                  {new Date(
                                    submission.submittedAt,
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {submission.grade !== null && (
                              <>
                                <div className="mt-2 flex items-center justify-between">
                                  <span className="text-muted-foreground">
                                    Grade
                                  </span>
                                  <span className="font-semibold">
                                    {submission.grade} /{' '}
                                    {assignment.maxGrade ?? 100}
                                  </span>
                                </div>
                                {submission.feedback && (
                                  <div className="mt-2">
                                    <span className="text-muted-foreground text-xs">
                                      Feedback
                                    </span>
                                    <p className="mt-1 whitespace-pre-wrap text-sm">
                                      {submission.feedback}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {canSubmit && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleSaveSubmission(false)}
                              disabled={submissionMutation.status === 'pending'}
                            >
                              <SaveIcon className="mr-2 size-4" />
                              Save Draft
                            </Button>
                            <Button
                              onClick={() => handleSaveSubmission(true)}
                              disabled={submissionMutation.status === 'pending'}
                            >
                              <SendIcon className="mr-2 size-4" />
                              Submit
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allSubmissions.length === 0 ? (
                      <div className="text-muted-foreground py-8 text-center">
                        <p>No submissions yet</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Grade</TableHead>
                            <TableHead>Submitted</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(allSubmissions as Array<SubmissionWithStudent>).map(
                            (sub) => (
                              <TableRow
                                key={sub.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleOpenGradingModal(sub)}
                              >
                                <TableCell className="font-medium">
                                  {sub.student.fullName}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      sub.grade !== null
                                        ? 'default'
                                        : sub.status === 'submitted'
                                          ? 'default'
                                          : 'secondary'
                                    }
                                  >
                                    {sub.grade !== null
                                      ? 'Graded'
                                      : sub.status === 'submitted'
                                        ? 'Submitted'
                                        : 'Draft'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {sub.grade !== null
                                    ? `${sub.grade} / ${assignment.maxGrade ?? 100}`
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  {sub.submittedAt
                                    ? new Date(
                                        sub.submittedAt,
                                      ).toLocaleDateString()
                                    : '-'}
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Assignment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update the assignment information
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">
                Title <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="title"
                value={assignmentFormData.title}
                onChange={(e) =>
                  setAssignmentFormData({
                    ...assignmentFormData,
                    title: e.target.value,
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                rows={4}
                value={assignmentFormData.description}
                onChange={(e) =>
                  setAssignmentFormData({
                    ...assignmentFormData,
                    description: e.target.value,
                  })
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
                value={assignmentFormData.dueDate}
                onChange={(e) =>
                  setAssignmentFormData({
                    ...assignmentFormData,
                    dueDate: e.target.value,
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="maxGrade">Maximum Grade</FieldLabel>
              <Input
                id="maxGrade"
                type="number"
                value={assignmentFormData.maxGrade.toString()}
                onChange={(e) =>
                  setAssignmentFormData({
                    ...assignmentFormData,
                    maxGrade: parseInt(e.target.value) || 100,
                  })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Select
                value={assignmentFormData.status}
                onValueChange={(value) =>
                  setAssignmentFormData({
                    ...assignmentFormData,
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
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAssignment}
              disabled={updateAssignmentMutation.status === 'pending'}
            >
              {updateAssignmentMutation.status === 'pending'
                ? 'Saving...'
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Assignment Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this assignment? This action
              cannot be undone and will delete all student submissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteAssignmentMutation.mutate({
                  data: { assignmentId: assignment.id },
                })
              }}
              disabled={deleteAssignmentMutation.status === 'pending'}
            >
              {deleteAssignmentMutation.status === 'pending'
                ? 'Deleting...'
                : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog open={showGradingDialog} onOpenChange={setShowGradingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              {selectedSubmission?.student.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-semibold">Student's Answer</h4>
              <div className="rounded-md bg-muted p-4">
                <p className="whitespace-pre-wrap text-sm">
                  {selectedSubmission?.content || 'No content provided'}
                </p>
              </div>
            </div>
            {selectedSubmission?.fileUrl && (
              <div>
                <h4 className="mb-2 font-semibold">File URL</h4>
                <a
                  href={selectedSubmission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  {selectedSubmission.fileUrl}
                </a>
              </div>
            )}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="grade">
                  Grade (max: {assignment.maxGrade ?? 100})
                </FieldLabel>
                <Input
                  id="grade"
                  type="number"
                  min="0"
                  max={assignment.maxGrade ?? 100}
                  value={gradingFormData.grade}
                  onChange={(e) =>
                    setGradingFormData({
                      ...gradingFormData,
                      grade: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="feedback">Feedback</FieldLabel>
                <Textarea
                  id="feedback"
                  rows={4}
                  placeholder="Provide feedback to the student..."
                  value={gradingFormData.feedback}
                  onChange={(e) =>
                    setGradingFormData({
                      ...gradingFormData,
                      feedback: e.target.value,
                    })
                  }
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowGradingDialog(false)
                setSelectedSubmission(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGradeSubmission}
              disabled={gradingMutation.status === 'pending'}
            >
              {gradingMutation.status === 'pending'
                ? 'Saving...'
                : 'Save Grade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
