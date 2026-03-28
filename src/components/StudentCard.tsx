import type { StudentWithStats } from '@/types/student'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

type StudentCardProps = {
  student: StudentWithStats
  onClick: () => void
}

export function StudentCard({ student, onClick }: StudentCardProps) {
  const initials = student.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-3">
        <Avatar className="size-12">
          <AvatarImage src={student.avatarUrl ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold leading-none">{student.fullName}</h3>
          <p className="text-muted-foreground text-sm">{student.email}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Assignments</span>
          <span className="font-medium">
            {student.assignmentStats.submittedAssignments} /{' '}
            {student.assignmentStats.totalAssignments}
          </span>
        </div>

        {student.assignmentStats.averageGradeByCourse.length > 0 && (
          <div className="space-y-2">
            <span className="text-muted-foreground text-sm">
              Average Grades
            </span>
            <div className="space-y-1.5">
              {student.assignmentStats.averageGradeByCourse.map((course) => (
                <div
                  key={course.courseId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground truncate text-xs">
                    {course.courseTitle}
                  </span>
                  <Badge variant="secondary" className="ml-2 font-mono">
                    {course.averageGrade}/{course.maxGrade}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Enrolled Courses</span>
          <span className="font-medium">{student.enrollmentCount}</span>
        </div>
      </CardContent>
    </Card>
  )
}
