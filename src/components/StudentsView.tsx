import { useRouter } from '@tanstack/react-router'
import { StudentCard } from './StudentCard'
import type { StudentWithStats } from '@/types/student'
import { Card } from '@/components/ui/card'

type StudentsViewProps = {
  students: Array<StudentWithStats>
  isLoading: boolean
}

function StudentCardSkeleton() {
  return (
    <Card className="overflow-hidden border-0 bg-linear-to-br from-background via-background to-muted/30 shadow-sm">
      <div className="flex items-center gap-4 p-4">
        <div className="size-12 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-3 p-4 pt-0">
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
        <div className="h-16 w-full animate-pulse rounded bg-muted" />
        <div className="h-8 w-full animate-pulse rounded bg-muted" />
      </div>
    </Card>
  )
}

export function StudentsView({ students, isLoading }: StudentsViewProps) {
  const router = useRouter()

  const handleStudentClick = (studentId: string) => {
    router.navigate({
      to: '/students/$studentId',
      params: { studentId },
      search: {
        fromDashboard: true,
        activeTab: 'students',
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Students</h2>
          <p className="text-muted-foreground mt-1">
            Browse all students in the system
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <StudentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
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
  )
}
