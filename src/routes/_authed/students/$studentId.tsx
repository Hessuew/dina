import { createFileRoute, useRouter } from '@tanstack/react-router'
import { CalendarIcon, ChevronLeft } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getStudentDetail } from '@/utils/students'

export const Route = createFileRoute('/_authed/students/$studentId')({
  loader: async ({ params }) => {
    const result = await getStudentDetail({
      data: { studentId: params.studentId },
    })
    return result
  },
  component: StudentDetailComponent,
})

function StudentDetailComponent() {
  const { student } = Route.useLoaderData()
  const router = useRouter()

  const handleAssignmentClick = (assignmentId: string) => {
    router.navigate({
      to: '/assignments/$assignmentId',
      params: { assignmentId },
      search: {
        calendarMonth: undefined,
        fromCalendar: false,
        fromDashboard: false,
      },
    })
  }

  const initials = student.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const assignmentsByCourse = student.enrollments.map((enrollment) => ({
    course: enrollment,
    assignments: student.assignments.filter(
      (a) => a.courseId === enrollment.courseId,
    ),
  }))

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.navigate({ to: '/students' })}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Student Details</h1>
          <p className="text-muted-foreground mt-1">
            View student information and grades
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            <Avatar className="size-20">
              <AvatarImage src={student.avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <CardTitle className="text-2xl">{student.fullName}</CardTitle>
              <CardDescription className="text-base">
                {student.email}
              </CardDescription>
              {student.bio && (
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                  {student.bio}
                </p>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary">
                  {student.enrollments.length} Enrolled Courses
                </Badge>
                <Badge variant="secondary">
                  {student.assignments.length} Submitted Assignments
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Assignments & Grades</h2>
          <p className="text-muted-foreground mt-1">
            All submitted assignments sorted by due date
          </p>
        </div>

        {assignmentsByCourse.map(({ course, assignments }) => {
          if (assignments.length === 0) return null

          const courseGrades = assignments
            .filter((a) => a.submission?.grade !== null)
            .map((a) => ({
              grade: a.submission!.grade!,
              maxGrade: a.maxGrade ?? 100,
            }))

          const averageGrade =
            courseGrades.length > 0
              ? Math.round(
                  courseGrades.reduce(
                    (sum, g) => sum + (g.grade / g.maxGrade) * 100,
                    0,
                  ) / courseGrades.length,
                )
              : null

          return (
            <div key={course.courseId} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {course.courseTitle}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {assignments.length} assignment
                    {assignments.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {averageGrade !== null && (
                  <Badge variant="default" className="text-base">
                    Average: {averageGrade}/100
                  </Badge>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {assignments.map((assignment) => {
                  const isGraded = assignment.submission?.grade !== null

                  return (
                    <Card
                      key={assignment.id}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleAssignmentClick(assignment.id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">
                            {assignment.title}
                          </CardTitle>
                          {isGraded ? (
                            <Badge variant="default">Graded</Badge>
                          ) : (
                            <Badge variant="secondary">Submitted</Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {assignment.lessonTitle}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="text-muted-foreground size-4" />
                          <span>
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </span>
                        </div>

                        {isGraded && (
                          <div className="flex items-center justify-between border-t pt-3 text-sm">
                            <span className="text-muted-foreground">Grade</span>
                            <span className="text-lg font-semibold">
                              {assignment.submission?.grade} /{' '}
                              {assignment.maxGrade ?? 100}
                            </span>
                          </div>
                        )}

                        {assignment.submission?.submittedAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Submitted
                            </span>
                            <span>
                              {new Date(
                                assignment.submission.submittedAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {assignment.submission?.gradedAt && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Graded
                            </span>
                            <span>
                              {new Date(
                                assignment.submission.gradedAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}

        {student.assignments.length === 0 && (
          <div className="text-muted-foreground py-12 text-center">
            <p className="mb-2 text-lg font-medium">No submitted assignments</p>
            <p className="text-sm">
              This student hasn't submitted any assignments yet
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
