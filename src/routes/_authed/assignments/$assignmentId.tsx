import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  CalendarIcon,
  ChevronLeft,
  ClockIcon,
  PencilIcon,
  SaveIcon,
  SendIcon,
  TrashIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
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
  getAssignment,
  getAssignmentSubmissions,
} from '@/utils/assignments'
import { AssignmentDialog } from '@/components/dialog/AssignmentDialog'
import { cn } from '@/lib/utils'

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
      fromCalendar: search.fromCalendar === true,
      calendarMonth: search.calendarMonth as string | undefined,
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
  const { fromDashboard, fromCalendar, calendarMonth } = Route.useSearch()
  const { assignment, submission, role, allSubmissions } = loaderData

  const [dialogMode, setDialogMode] = useState<
    'edit' | 'delete' | 'grade' | null
  >(null)
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithStudent | null>(null)

  const [submissionFormData, setSubmissionFormData] = useState({
    content: submission?.content || '',
    fileUrl: submission?.fileUrl || '',
  })

  const canEdit = role === 'teacher' || role === 'admin'
  const isStudent = role === 'student'
  const isPastDue = new Date(assignment.dueDate) < new Date()
  const canSubmit = isStudent && assignment.status === 'published' && !isPastDue

  const submissionMutation = useMutation({
    fn: createOrUpdateSubmission,
    onSuccess: async () => {
      toast.success('Submission saved successfully!')
      await router.invalidate()
    },
  })

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

  const goBack = () => {
    if (fromCalendar && calendarMonth) {
      router.navigate({ to: '/calendar', search: { month: calendarMonth } })
    } else if (fromDashboard) {
      router.navigate({ to: '/dashboard' })
    } else {
      router.history.back()
    }
  }

  const statusColors: Record<string, string> = {
    published: 'border-[#C5A059]/40 bg-[#C5A059]/8 text-[#9B7A41]',
    closed: 'border-red-300/60 bg-red-50 text-red-600',
    draft: 'border-[#1A1A1A]/12 bg-[#1A1A1A]/4 text-[#8E816D]',
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
            {assignment.lesson.title}
          </button>

          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="h-px w-10 bg-[#C5A059]/50" />
              <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
                {assignment.title}
              </h1>
              <div className="mt-3 flex items-center gap-4 text-[0.68rem] text-[#9B8C7C]">
                <span className="tracking-wides">
                  {assignment.lesson.course.title}
                </span>
                <span className="text-[#C5A059]/40">·</span>
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3" />
                  <span>
                    Due{' '}
                    {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ClockIcon className="size-3" />
                  <span>
                    {new Date(assignment.dueDate).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <div
                className={cn(
                  'border px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.22em] uppercase',
                  statusColors[assignment.status] ?? statusColors.draft,
                )}
              >
                {assignment.status.charAt(0).toUpperCase() +
                  assignment.status.slice(1)}
              </div>
              {canEdit && (
                <>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] transition-all hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
                    onClick={() => setDialogMode('edit')}
                  >
                    <PencilIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] transition-all hover:border-red-300 hover:text-red-600"
                    onClick={() => setDialogMode('delete')}
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Left — assignment details */}
          <div className="border border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.10)]">
            <div className="px-6 py-6">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                About this assignment
              </div>
              {assignment.description ? (
                <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#4E463D]">
                  {assignment.description}
                </p>
              ) : (
                <p className="mt-4 text-sm text-[#9B8C7C] italic">
                  No description provided.
                </p>
              )}
            </div>

            <div className="border-t border-[#1A1A1A]/8 px-6 py-5">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                    Maximum Grade
                  </span>
                  <span className="font-serif text-base text-[#1C1815]">
                    {assignment.maxGrade ?? 100} pts
                  </span>
                </div>
                {isPastDue && (
                  <div className="border border-red-200 bg-red-50/60 px-4 py-3 text-xs text-red-600">
                    This assignment is past due
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — submission / submissions list */}
          <div className="border border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.10)]">
            <div className="border-b border-[#1A1A1A]/8 px-6 py-5">
              <div className="h-px w-8 bg-[#C5A059]/40" />
              <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                {isStudent ? 'Your Submission' : 'Submissions'}
              </div>
              <div className="mt-1 font-serif text-xl text-[#1C1815]">
                {isStudent
                  ? canSubmit
                    ? 'Submit before the due date'
                    : isPastDue
                      ? 'Submission period ended'
                      : 'Not yet open'
                  : `${(allSubmissions as Array<SubmissionWithStudent>).length} submitted`}
              </div>
            </div>

            {isStudent ? (
              <div className="px-6 py-6">
                {assignment.status !== 'published' ? (
                  <p className="py-8 text-center text-sm text-[#9B8C7C] italic">
                    This assignment is not yet available.
                  </p>
                ) : (
                  <div className="space-y-5">
                    <Field>
                      <FieldLabel
                        htmlFor="content"
                        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                      >
                        Your Answer
                      </FieldLabel>
                      <Textarea
                        id="content"
                        rows={8}
                        placeholder="Enter your answer here..."
                        value={submissionFormData.content}
                        className="rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815] placeholder:text-[#9B8C7C] focus:border-[#C5A059]/50"
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
                      <FieldLabel
                        htmlFor="fileUrl"
                        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                      >
                        File URL (Optional)
                      </FieldLabel>
                      <Input
                        id="fileUrl"
                        type="url"
                        placeholder="https://..."
                        value={submissionFormData.fileUrl}
                        className="rounded-none border-[#1A1A1A]/15 bg-white/70 text-[#1C1815] placeholder:text-[#9B8C7C] focus:border-[#C5A059]/50"
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
                      <div className="border border-[#1A1A1A]/10 bg-white/50 px-4 py-4 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                            Status
                          </span>
                          <span
                            className={cn(
                              'border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase',
                              submission.status === 'submitted'
                                ? 'border-[#C5A059]/40 text-[#9B7A41]'
                                : 'border-[#1A1A1A]/12 text-[#8E816D]',
                            )}
                          >
                            {submission.status === 'submitted'
                              ? 'Submitted'
                              : 'Draft'}
                          </span>
                        </div>
                        {submission.submittedAt && (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                              Submitted
                            </span>
                            <span className="text-xs text-[#4E463D]">
                              {new Date(
                                submission.submittedAt,
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {submission.grade !== null && (
                          <>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                                Grade
                              </span>
                              <span className="font-serif text-base text-[#1C1815]">
                                {submission.grade} /{' '}
                                {assignment.maxGrade ?? 100}
                              </span>
                            </div>
                            {submission.feedback && (
                              <div className="mt-3">
                                <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                                  Feedback
                                </span>
                                <p className="mt-2 text-sm whitespace-pre-wrap text-[#4E463D]">
                                  {submission.feedback}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {canSubmit && (
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="rounded-none border-[#1A1A1A]/15 text-[#6B5F4D] hover:border-[#1A1A1A]/25 hover:bg-white/60"
                          onClick={() => handleSaveSubmission(false)}
                          disabled={submissionMutation.status === 'pending'}
                        >
                          <SaveIcon className="size-3.5" />
                          Save Draft
                        </Button>
                        <Button
                          theme="light"
                          onClick={() => handleSaveSubmission(true)}
                          disabled={submissionMutation.status === 'pending'}
                        >
                          <SendIcon className="size-3.5" />
                          Submit
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {(allSubmissions as Array<SubmissionWithStudent>).length ===
                0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm text-[#9B8C7C] italic">
                      No submissions yet
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#1A1A1A]/8 hover:bg-transparent">
                        <TableHead className="text-[0.62rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                          Student
                        </TableHead>
                        <TableHead className="text-[0.62rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                          Status
                        </TableHead>
                        <TableHead className="text-[0.62rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                          Grade
                        </TableHead>
                        <TableHead className="text-[0.62rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                          Submitted
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(allSubmissions as Array<SubmissionWithStudent>).map(
                        (sub) => (
                          <TableRow
                            key={sub.id}
                            className="cursor-pointer border-[#1A1A1A]/6 transition-colors hover:bg-[#EDE8DE]/60"
                            onClick={() => {
                              setSelectedSubmission(sub)
                              setDialogMode('grade')
                            }}
                          >
                            <TableCell className="font-serif text-sm text-[#1C1815]">
                              {sub.student.fullName}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  'border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase',
                                  sub.grade !== null
                                    ? 'border-[#C5A059]/40 text-[#9B7A41]'
                                    : sub.status === 'submitted'
                                      ? 'border-blue-300/60 text-blue-600'
                                      : 'border-[#1A1A1A]/12 text-[#8E816D]',
                                )}
                              >
                                {sub.grade !== null
                                  ? 'Graded'
                                  : sub.status === 'submitted'
                                    ? 'Submitted'
                                    : 'Draft'}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-[#4E463D]">
                              {sub.grade !== null
                                ? `${sub.grade} / ${assignment.maxGrade ?? 100}`
                                : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-[#9B8C7C]">
                              {sub.submittedAt
                                ? new Date(sub.submittedAt).toLocaleDateString()
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ),
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Dialog (edit / delete) */}
      {(dialogMode === 'edit' || dialogMode === 'delete') && (
        <AssignmentDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setDialogMode(null)
          }}
          mode={dialogMode}
          assignment={assignment}
          onDeleteSuccess={() => {
            if (fromDashboard) {
              router.navigate({ to: '/assignments' })
            } else {
              router.navigate({
                to: '/lessons/$lessonId',
                params: { lessonId: assignment.lesson.id },
              })
            }
          }}
        />
      )}

      {/* Grade Dialog */}
      {dialogMode === 'grade' && selectedSubmission && (
        <AssignmentDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode(null)
              setSelectedSubmission(null)
            }
          }}
          mode="grade"
          assignment={assignment}
          submission={selectedSubmission}
        />
      )}
    </div>
  )
}
