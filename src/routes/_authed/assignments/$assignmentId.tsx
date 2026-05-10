import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  CalendarIcon,
  ClockIcon,
  PencilIcon,
  SaveIcon,
  SendIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, createButtonColumn } from '@/components/table/DataTable'
import { useDialogState } from '@/hooks/useDialogState'
import { useMutation } from '@/hooks/useMutation'
import {
  createOrUpdateSubmission,
  getAssignment,
  getAssignmentSubmissions,
} from '@/utils/assignments'
import { AssignmentDialog } from '@/components/dialog/AssignmentDialog'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { DarkCard } from '@/components/ui/dark-card'

const getAssignmentData = createServerFn({ method: 'POST' })
  .inputValidator((d: { assignmentId: string }) => d)
  .handler(async ({ data }) => {
    return await getAssignment({ data })
  })

const getSubmissionsData = createServerFn({ method: 'POST' })
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

const columnHelper = createColumnHelper<SubmissionWithStudent>()

function AssignmentDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const { fromDashboard, fromCalendar, calendarMonth } = Route.useSearch()
  const { assignment, submission, role, allSubmissions, permissions } =
    loaderData

  const assignmentDialog = useDialogState()
  const gradeDialog = useDialogState<SubmissionWithStudent>()

  const submissionsColumns: Array<ColumnDef<SubmissionWithStudent, any>> = [
    columnHelper.accessor('student.fullName', {
      cell: (info) => (
        <span className="font-serif text-sm text-[#F8F4EC]">
          {info.getValue()}
        </span>
      ),
      header: 'Student',
    }),
    columnHelper.accessor('status', {
      cell: (info) => {
        const sub = info.row.original
        const variant =
          sub.grade !== null
            ? 'graded'
            : sub.status === 'submitted'
              ? 'submitted'
              : 'draft'
        return <StatusChip variant={variant} size="sm" />
      },
      header: 'Status',
    }),
    columnHelper.accessor('grade', {
      cell: (info) => {
        const sub = info.row.original
        return (
          <span className="text-sm text-[#AFA28F]">
            {sub.grade !== null
              ? `${sub.grade} / ${assignment.maxGrade ?? 100}`
              : '—'}
          </span>
        )
      },
      header: 'Grade',
    }),
    columnHelper.accessor('submittedAt', {
      cell: (info) => {
        const sub = info.row.original
        return (
          <span className="text-sm text-[#8E816D]">
            {sub.submittedAt
              ? new Date(sub.submittedAt).toLocaleDateString()
              : '—'}
          </span>
        )
      },
      header: 'Submitted',
    }),
    createButtonColumn<SubmissionWithStudent>([
      {
        icon: PencilIcon,
        label: 'Grade',
        onClick: (sub) => {
          gradeDialog.openDialog('edit', sub)
        },
      },
    ]),
  ]

  const [submissionFormData, setSubmissionFormData] = useState({
    content: submission?.content || '',
    fileUrl: submission?.fileUrl || '',
  })

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

  return (
    <PageLayout>
      <PageHeader
        title={assignment.title}
        onBack={goBack}
        metadata={
          <>
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
          </>
        }
        actions={
          <EntityHeaderActions
            status={assignment.status}
            canEdit={permissions.canEdit}
            isCourseTeacher={permissions.isCourseTeacher}
            onEdit={() => assignmentDialog.openDialog('edit')}
            onDelete={() => assignmentDialog.openDialog('delete')}
          />
        }
      />

      {/* Main grid */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Left — assignment details */}
        <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
          <DarkCard label="About this assignment">
            {assignment.description ? (
              <p className="mt-4 text-sm leading-7 whitespace-pre-wrap text-[#CFC6B7]">
                {assignment.description}
              </p>
            ) : (
              <p className="mt-4 text-sm text-[#8E816D] italic">
                No description provided.
              </p>
            )}
          </DarkCard>

          <div className="border-t border-white/8 bg-[#151515]/88 px-6 py-5">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                  Maximum Grade
                </span>
                <span className="font-serif text-base text-[#F8F4EC]">
                  {assignment.maxGrade ?? 100} pts
                </span>
              </div>
              {isPastDue && (
                <div className="border border-red-400/30 bg-red-900/20 px-4 py-3 text-xs text-red-400">
                  This assignment is past due
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — submission / submissions list */}
        <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
          <div className="border-b border-white/8 px-6 py-5">
            <div className="h-px w-8 bg-[#C5A059]/40" />
            <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
              {isStudent ? 'Your Submission' : 'Submissions'}
            </div>
            <div className="mt-1 font-serif text-xl text-[#F8F4EC]">
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
                <p className="py-8 text-center text-sm text-[#8E816D] italic">
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
                      className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
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
                      className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
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
                    <div className="border border-white/10 bg-white/4 px-4 py-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                          Status
                        </span>
                        <StatusChip
                          variant={
                            submission.status === 'submitted'
                              ? 'submitted'
                              : 'draft'
                          }
                          size="sm"
                        />
                      </div>
                      {submission.submittedAt && (
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                            Submitted
                          </span>
                          <span className="text-xs text-[#AFA28F]">
                            {new Date(submission.submittedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {submission.grade !== null && (
                        <>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                              Grade
                            </span>
                            <span className="font-serif text-base text-[#F8F4EC]">
                              {submission.grade} / {assignment.maxGrade ?? 100}
                            </span>
                          </div>
                          {submission.feedback && (
                            <div className="mt-3">
                              <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                                Feedback
                              </span>
                              <p className="mt-2 text-sm whitespace-pre-wrap text-[#CFC6B7]">
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
                        theme="dark"
                        onClick={() => handleSaveSubmission(false)}
                        disabled={submissionMutation.isPending}
                      >
                        <SaveIcon className="size-3.5" />
                        Save Draft
                      </Button>
                      <Button
                        theme="dark"
                        onClick={() => handleSaveSubmission(true)}
                        disabled={submissionMutation.isPending}
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
              {(allSubmissions as Array<SubmissionWithStudent>).length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-[#AFA28F] italic">
                    No submissions yet
                  </p>
                </div>
              ) : (
                <DataTable
                  columns={submissionsColumns}
                  data={allSubmissions as Array<SubmissionWithStudent>}
                  pageSize={10}
                  searchPlaceholder="Search by student name…"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Dialog (edit / delete) */}
      {(assignmentDialog.dialogMode === 'edit' ||
        assignmentDialog.dialogMode === 'delete') &&
        assignmentDialog.isOpen && (
          <AssignmentDialog
            open={true}
            onOpenChange={(open) => {
              if (!open) assignmentDialog.closeDialog()
            }}
            mode={assignmentDialog.dialogMode}
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
      {gradeDialog.isOpen && gradeDialog.dialogItem && (
        <AssignmentDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) gradeDialog.closeDialog()
          }}
          mode="grade"
          assignment={assignment}
          submission={gradeDialog.dialogItem}
        />
      )}
    </PageLayout>
  )
}
