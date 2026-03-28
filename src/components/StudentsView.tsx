import { useRouter } from '@tanstack/react-router'
import { StudentCard } from './StudentCard'
import type { StudentWithStats } from '@/types/student'

type StudentsViewProps = {
  students: Array<StudentWithStats>
}

export function StudentsView({ students }: StudentsViewProps) {
  const router = useRouter()

  const handleStudentClick = (studentId: string) => {
    router.navigate({
      to: '/students/$studentId',
      params: { studentId },
      search: {
        fromDashboard: false,
      },
    })
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Students</h2>
          <p className="text-muted-foreground mt-1">
            Browse all students in the system
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">No students yet</h3>
          <p className="text-muted-foreground text-sm">
            Students will appear here once they are added to the system
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Students</h2>
          <p className="text-muted-foreground mt-1">
            Browse all students in the system
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClick={() => handleStudentClick(student.id)}
            />
          ))}
        </div>
      </div>
    </>
  )
}
