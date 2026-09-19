import { PencilIcon } from 'lucide-react'
import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import type { SubmissionStatusVariant } from '@/utils/assignments/domain/assignment-detail.domain'
import {
  formatSubmissionGrade,
  formatSubmittedDate,
  resolveSubmissionStatusVariant,
} from '@/utils/assignments/domain/assignment-detail.domain'
import { StatusChip } from '@/components/ui/status-chip'
import { createButtonColumn } from '@/components/table/create-button-column'
import { DataTable } from '@/components/table/DataTable'

type SubmissionWithStudent = {
  id: string
  content: string | null
  status: SubmissionStatusVariant
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

function buildSubmissionsColumns({
  maxGrade,
  onGrade,
}: {
  maxGrade: number | null | undefined
  onGrade: (submission: SubmissionWithStudent) => void
}): Array<ColumnDef<SubmissionWithStudent, any>> {
  return [
    columnHelper.accessor('student.fullName', {
      cell: (info) => (
        <span className="font-serif text-sm text-[#F8F4EC]">
          {info.getValue()}
        </span>
      ),
      header: 'Student',
    }),
    columnHelper.accessor('status', {
      cell: (info) => (
        <StatusChip
          variant={resolveSubmissionStatusVariant(info.row.original)}
          size="sm"
        />
      ),
      header: 'Status',
    }),
    columnHelper.accessor('grade', {
      cell: (info) => (
        <span className="text-sm text-[#AFA28F]">
          {formatSubmissionGrade(info.row.original.grade, maxGrade)}
        </span>
      ),
      header: 'Grade',
    }),
    columnHelper.accessor('submittedAt', {
      cell: (info) => (
        <span className="text-sm text-[#8E816D]">
          {formatSubmittedDate(info.row.original.submittedAt)}
        </span>
      ),
      header: 'Submitted',
    }),
    createButtonColumn<SubmissionWithStudent>([
      { icon: PencilIcon, label: 'Grade', onClick: onGrade },
    ]),
  ]
}

export function AssignmentSubmissionsTable({
  allSubmissions,
  maxGrade,
  onGrade,
}: {
  allSubmissions: Array<SubmissionWithStudent>
  maxGrade: number | null | undefined
  onGrade: (submission: SubmissionWithStudent) => void
}) {
  if (allSubmissions.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-[#AFA28F] italic">No submissions yet</p>
      </div>
    )
  }

  const submissionsColumns = buildSubmissionsColumns({ maxGrade, onGrade })

  return (
    <DataTable
      columns={submissionsColumns}
      data={allSubmissions}
      pageSize={10}
      searchPlaceholder="Search by student name…"
    />
  )
}
