import { SaveIcon, SendIcon } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/components/table/DataTable'
import { DarkCard } from '@/components/ui/dark-card'

type Assignment = {
  id: string
  description: string | null
  dueDate: Date
  maxGrade: number | null
  status: 'draft' | 'published' | 'closed'
}

type Submission = {
  content: string | null
  fileUrl: string | null
  status: 'draft' | 'submitted' | 'graded' | 'returned'
  grade: number | null
  feedback: string | null
  submittedAt: Date | null
}

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

type SubmissionFormData = {
  content: string
  fileUrl: string
}

type AssignmentDetailSectionsProps = {
  assignment: Assignment
  submission: Submission | null | undefined
  allSubmissions: Array<SubmissionWithStudent>
  submissionsColumns: Array<ColumnDef<SubmissionWithStudent, any>>
  isStudent: boolean
  isPastDue: boolean
  canSubmit: boolean
  submissionFormData: SubmissionFormData
  isSavingSubmission: boolean
  onChangeSubmissionFormData: (data: SubmissionFormData) => void
  onSaveSubmission: (submit: boolean) => void
}

function AssignmentAboutCard({
  assignment,
  isPastDue,
}: {
  assignment: Assignment
  isPastDue: boolean
}) {
  return (
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
  )
}

function SubmissionHeader({
  isStudent,
  canSubmit,
  isPastDue,
  submissionCount,
}: {
  isStudent: boolean
  canSubmit: boolean
  isPastDue: boolean
  submissionCount: number
}) {
  const title = isStudent ? 'Your Submission' : 'Submissions'
  const subtitle = isStudent
    ? canSubmit
      ? 'Submit before the due date'
      : isPastDue
        ? 'Submission period ended'
        : 'Not yet open'
    : `${submissionCount} submitted`

  return (
    <div className="border-b border-white/8 px-6 py-5">
      <div className="h-px w-8 bg-[#C5A059]/40" />
      <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
        {title}
      </div>
      <div className="mt-1 font-serif text-xl text-[#F8F4EC]">{subtitle}</div>
    </div>
  )
}

function SubmissionStatusCard({
  submission,
  maxGrade,
}: {
  submission: Submission | null | undefined
  maxGrade: number | null
}) {
  if (!submission) return null

  return (
    <div className="border border-white/10 bg-white/4 px-4 py-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
          Status
        </span>
        <StatusChip
          variant={submission.status === 'submitted' ? 'submitted' : 'draft'}
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
              {submission.grade} / {maxGrade ?? 100}
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
  )
}

function StudentSubmissionForm({
  assignment,
  submission,
  formData,
  canSubmit,
  isSavingSubmission,
  onChangeSubmissionFormData,
  onSaveSubmission,
}: {
  assignment: Assignment
  submission: Submission | null | undefined
  formData: SubmissionFormData
  canSubmit: boolean
  isSavingSubmission: boolean
  onChangeSubmissionFormData: (data: SubmissionFormData) => void
  onSaveSubmission: (submit: boolean) => void
}) {
  if (assignment.status !== 'published') {
    return (
      <p className="py-8 text-center text-sm text-[#8E816D] italic">
        This assignment is not yet available.
      </p>
    )
  }

  return (
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
          value={formData.content}
          className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
          onChange={(e) =>
            onChangeSubmissionFormData({
              ...formData,
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
          value={formData.fileUrl}
          className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
          onChange={(e) =>
            onChangeSubmissionFormData({
              ...formData,
              fileUrl: e.target.value,
            })
          }
          disabled={!canSubmit}
        />
      </Field>

      <SubmissionStatusCard
        submission={submission}
        maxGrade={assignment.maxGrade}
      />

      {canSubmit && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            theme="dark"
            onClick={() => onSaveSubmission(false)}
            disabled={isSavingSubmission}
          >
            <SaveIcon className="size-3.5" />
            Save Draft
          </Button>
          <Button
            theme="dark"
            onClick={() => onSaveSubmission(true)}
            disabled={isSavingSubmission}
          >
            <SendIcon className="size-3.5" />
            Submit
          </Button>
        </div>
      )}
    </div>
  )
}

function SubmissionsTable({
  allSubmissions,
  submissionsColumns,
}: {
  allSubmissions: Array<SubmissionWithStudent>
  submissionsColumns: Array<ColumnDef<SubmissionWithStudent, any>>
}) {
  if (allSubmissions.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[#AFA28F] italic">No submissions yet</p>
      </div>
    )
  }

  return (
    <DataTable
      columns={submissionsColumns}
      data={allSubmissions}
      pageSize={10}
      searchPlaceholder="Search by student name…"
    />
  )
}

function SubmissionPanel({
  assignment,
  submission,
  allSubmissions,
  submissionsColumns,
  isStudent,
  isPastDue,
  canSubmit,
  submissionFormData,
  isSavingSubmission,
  onChangeSubmissionFormData,
  onSaveSubmission,
}: AssignmentDetailSectionsProps) {
  return (
    <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      <SubmissionHeader
        isStudent={isStudent}
        canSubmit={canSubmit}
        isPastDue={isPastDue}
        submissionCount={allSubmissions.length}
      />

      {isStudent ? (
        <div className="px-6 py-6">
          <StudentSubmissionForm
            assignment={assignment}
            submission={submission}
            formData={submissionFormData}
            canSubmit={canSubmit}
            isSavingSubmission={isSavingSubmission}
            onChangeSubmissionFormData={onChangeSubmissionFormData}
            onSaveSubmission={onSaveSubmission}
          />
        </div>
      ) : (
        <SubmissionsTable
          allSubmissions={allSubmissions}
          submissionsColumns={submissionsColumns}
        />
      )}
    </div>
  )
}

export function AssignmentDetailSections(props: AssignmentDetailSectionsProps) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <AssignmentAboutCard
        assignment={props.assignment}
        isPastDue={props.isPastDue}
      />
      <SubmissionPanel {...props} />
    </div>
  )
}
