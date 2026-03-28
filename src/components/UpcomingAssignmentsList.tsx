import { Link } from '@tanstack/react-router'
import { CalendarIcon, CheckCircle2Icon, CircleIcon } from 'lucide-react'
import type { Assignment } from './AssignmentsView'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type UpcomingAssignmentsListProps = {
  assignments: Array<Assignment>
  role: 'student' | 'teacher' | 'admin'
}

export function UpcomingAssignmentsList({
  assignments,
  role,
}: UpcomingAssignmentsListProps) {
  const now = new Date()

  const filteredAssignments = assignments
    .filter((assignment) => {
      if (role === 'student') {
        const isNotPastDue = new Date(assignment.dueDate) >= now
        const isNotGraded =
          !assignment.submission || assignment.submission.grade === null
        return assignment.status === 'published' && isNotPastDue && isNotGraded
      } else {
        return assignment.status === 'published'
      }
    })
    .slice(0, 5)

  const formatDate = (date: Date) => {
    const dateObj = new Date(date)
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const isOverdue = (dueDate: Date) => new Date(dueDate) < now

  const getSubmissionStatus = (assignment: Assignment) => {
    if (!assignment.submission) return 'Not Submitted'
    if (
      assignment.submission.status === 'submitted' ||
      assignment.submission.status === 'graded'
    ) {
      return 'Submitted'
    }
    return 'Not Submitted'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {role === 'student' ? 'Open Assignments' : 'Upcoming Assignments'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredAssignments.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {role === 'student'
              ? 'No open assignments'
              : 'No upcoming assignments'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssignments.map((assignment) => {
              const overdue = isOverdue(assignment.dueDate)
              const submissionStatus = getSubmissionStatus(assignment)
              const isSubmitted = submissionStatus === 'Submitted'

              return (
                <Link
                  key={assignment.id}
                  to="/assignments/$assignmentId"
                  params={{ assignmentId: assignment.id }}
                  search={{ fromDashboard: true, activeTab: 'courses' }}
                  className="block"
                >
                  <div className="group rounded-lg border p-3 transition-colors hover:bg-muted/50">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-muted-foreground mb-1 truncate text-xs">
                          {assignment.lesson.course.title}
                        </div>
                        <div className="mb-1 truncate font-medium text-sm group-hover:text-primary">
                          {assignment.title}
                        </div>
                      </div>
                      {role === 'student' && (
                        <Badge
                          variant={isSubmitted ? 'default' : 'secondary'}
                          className="shrink-0"
                        >
                          {isSubmitted ? (
                            <CheckCircle2Icon className="mr-1 size-3" />
                          ) : (
                            <CircleIcon className="mr-1 size-3" />
                          )}
                          {submissionStatus}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div
                        className={`flex items-center gap-1 ${
                          overdue
                            ? 'text-destructive font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        <CalendarIcon className="size-3" />
                        <span>Due {formatDate(assignment.dueDate)}</span>
                        {overdue && <span className="ml-1">(Overdue)</span>}
                      </div>
                      {role === 'teacher' && assignment.submissionStats && (
                        <div className="text-muted-foreground">
                          {assignment.submissionStats.submitted}/
                          {assignment.submissionStats.total} submitted
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
