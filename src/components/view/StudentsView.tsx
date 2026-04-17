import { useRouter } from '@tanstack/react-router'
import type { StudentWithStats } from '@/types/student'
import { StudentCard } from '@/components/card/StudentCard'

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
        <div className="mb-10">
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <h2 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
            Students
          </h2>
          <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
            Browse all students in the system
          </p>
        </div>

        <div className="flex flex-col items-center justify-center border border-[#1A1A1A]/8 p-12 text-center">
          <h3 className="mb-2 font-serif text-lg text-[#1C1815]">
            No students yet
          </h3>
          <p className="text-sm text-[#8E816D]">
            Students will appear here once they are added to the system
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
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
