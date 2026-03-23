import { useRouter } from '@tanstack/react-router'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type Assignment = {
  id: string
  title: string
  description: string | null
  dueDate: Date
  maxGrade: number | null
  status: 'draft' | 'published' | 'closed'
  lesson: {
    id: string
    title: string
    course: {
      id: string
      title: string
      startDate: Date | null
    }
  }
  submission?: {
    id: string
    status: 'draft' | 'submitted' | 'graded' | 'returned'
    grade: number | null
    submittedAt: Date | null
  } | null
  submissionStats?: {
    total: number
    submitted: number
    graded: number
  }
}

type AssignmentsViewProps = {
  assignments: Array<Assignment>
  role: 'student' | 'teacher' | 'admin'
}

export function AssignmentsView({ assignments, role }: AssignmentsViewProps) {
  const router = useRouter()
  const [selectedCourse, setSelectedCourse] = useState<string | null>('all')

  const courses = Array.from(
    new Map(
      assignments.map((a) => [a.lesson.course.id, a.lesson.course]),
    ).values(),
  ).sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
    return dateA - dateB
  })

  const filteredAssignments =
    selectedCourse === 'all'
      ? assignments
      : assignments.filter((a) => a.lesson.course.id === selectedCourse)

  const groupedByCourse = courses.map((course) => ({
    course,
    assignments: filteredAssignments.filter(
      (a) => a.lesson.course.id === course.id,
    ),
  }))

  const isOverdue = (dueDate: Date) => new Date(dueDate) < new Date()

  const getSubmissionStatus = (assignment: Assignment) => {
    if (!assignment.submission) return 'Not Submitted'
    if (assignment.submission.grade !== null) return 'Graded'
    if (assignment.submission.status === 'submitted') return 'Submitted'
    return 'Draft'
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Graded':
        return 'default'
      case 'Submitted':
        return 'default'
      case 'Draft':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getAssignmentStatusVariant = (status: string) => {
    switch (status) {
      case 'published':
        return 'default'
      case 'closed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <h2 className="text-2xl font-bold">Assignments</h2>
          <p className="text-muted-foreground mt-1">
            {role === 'student'
              ? 'View and submit your assignments'
              : 'Manage assignments and grade submissions'}
          </p>
        </div>
        {assignments.length > 0 && (
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by course">
                {selectedCourse === 'all'
                  ? 'All Courses'
                  : courses.find((c) => c.id === selectedCourse)?.title ||
                    'Select Course'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {groupedByCourse.map(({ course, assignments: courseAssignments }) => {
        if (courseAssignments.length === 0) return null

        return (
          <div key={course.id} className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{course.title}</h3>
              <p className="text-muted-foreground text-sm">
                {courseAssignments.length} assignment
                {courseAssignments.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courseAssignments.map((assignment) => {
                const overdue = isOverdue(assignment.dueDate)

                return (
                  <Card
                    key={assignment.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() =>
                      router.navigate({
                        to: '/assignments/$assignmentId',
                        params: { assignmentId: assignment.id },
                        search: {
                          fromDashboard: false,
                        },
                      })
                    }
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base">
                          {assignment.title}
                        </CardTitle>
                        {role === 'student' ? (
                          <Badge
                            variant={getStatusBadgeVariant(
                              getSubmissionStatus(assignment),
                            )}
                          >
                            {getSubmissionStatus(assignment)}
                          </Badge>
                        ) : (
                          <Badge
                            variant={getAssignmentStatusVariant(
                              assignment.status,
                            )}
                          >
                            {assignment.status.charAt(0).toUpperCase() +
                              assignment.status.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {assignment.lesson.title}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="size-4 text-muted-foreground" />
                        <span
                          className={
                            overdue ? 'text-destructive font-medium' : ''
                          }
                        >
                          {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                        {overdue && (
                          <Badge variant="destructive" className="ml-auto">
                            Overdue
                          </Badge>
                        )}
                      </div>

                      {role === 'student' ? (
                        <>
                          {assignment.submission?.grade !== null && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Grade
                              </span>
                              <span className="font-semibold">
                                {assignment.submission?.grade} /{' '}
                                {assignment.maxGrade ?? 100}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {assignment.submissionStats && (
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Submitted
                                </span>
                                <span className="font-medium">
                                  {assignment.submissionStats.submitted} /{' '}
                                  {assignment.submissionStats.total}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                  Graded
                                </span>
                                <span className="font-medium">
                                  {assignment.submissionStats.graded}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      {filteredAssignments.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <p className="mb-2 text-lg font-medium">No assignments found</p>
          <p className="text-sm">
            {selectedCourse === 'all'
              ? 'There are no assignments yet'
              : 'This course has no assignments'}
          </p>
        </div>
      )}
    </div>
  )
}
