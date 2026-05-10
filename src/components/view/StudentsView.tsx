import { format } from 'date-fns'
import { useRouter } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { StudentWithStats } from '@/types/student'
import { DataTable, createButtonColumn } from '@/components/table/DataTable'
import { createCrudActions } from '@/components/table/functions/createCrudActions'

type StudentsViewProps = {
  students: Array<StudentWithStats>
}

function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

function getAverageGrade(student: StudentWithStats): number | null {
  const grades = student.assignmentStats.averageGradeByCourse
  if (grades.length === 0) return null
  const avg =
    grades.reduce(
      (sum, g) => sum + (Number(g.averageGrade) / Number(g.maxGrade)) * 100,
      0,
    ) / grades.length
  return Math.round(avg)
}

const columnHelper = createColumnHelper<StudentWithStats>()

export function StudentsView({ students }: StudentsViewProps) {
  const router = useRouter()

  const columns: Array<ColumnDef<StudentWithStats, any>> = [
    columnHelper.accessor('fullName', {
      cell: (info) => {
        const student = info.row.original
        const initials = getInitials(student.fullName)
        return (
          <div className="flex items-center gap-3">
            {student.avatarUrl ? (
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                className="size-8 shrink-0 border border-white/10 object-cover"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] text-[0.6rem] font-medium text-[#E9D9B4]">
                {initials}
              </div>
            )}
            <span className="font-medium text-[#F8F4EC]">
              {student.fullName}
            </span>
          </div>
        )
      },
      header: 'Name',
    }),
    columnHelper.accessor('email', {
      cell: (info) => (
        <span className="text-[0.82rem] text-[#AFA28F]">{info.getValue()}</span>
      ),
      header: 'Email',
    }),
    columnHelper.accessor('createdAt', {
      cell: (info) => (
        <span className="text-[0.82rem] text-[#AFA28F]">
          {format(new Date(info.getValue()), 'MMM d, yyyy')}
        </span>
      ),
      header: 'Joined',
    }),
    columnHelper.display({
      cell: (info) => {
        const { submittedAssignments, totalAssignments } =
          info.row.original.assignmentStats
        return (
          <>
            {submittedAssignments}
            <span className="text-[#8E816D]">/{totalAssignments}</span>
          </>
        )
      },
      enableSorting: false,
      header: 'Submitted',
      id: 'submitted',
    }),
    columnHelper.display({
      cell: (info) => {
        const avg = getAverageGrade(info.row.original)
        if (avg === null) return <span className="text-[#8E816D]">—</span>
        return (
          <span className="border border-[#C5A059]/35 px-2 py-0.5 text-[0.68rem] font-medium text-[#D4B373]">
            {avg}%
          </span>
        )
      },
      enableSorting: false,
      header: 'Avg Grade',
      id: 'avgGrade',
    }),
    createButtonColumn(
      createCrudActions<StudentWithStats>({
        onView: (student) =>
          router.navigate({
            to: '/students/$studentId',
            params: { studentId: student.id },
            search: { fromDashboard: false },
          }),
      }),
    ),
  ]

  return (
    <div className="space-y-6">
      <div className="mb-10">
        <div className="h-px w-10 bg-[#C5A059]/50" />
        <h2 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
          Students
        </h2>
        <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
          Browse all students in the system
        </p>
      </div>

      <DataTable
        columns={columns}
        data={students}
        pageSize={15}
        searchPlaceholder="Search by name or email…"
      />
    </div>
  )
}
