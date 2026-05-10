import { useRouter } from '@tanstack/react-router'
import { ArrowRight, CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/ui/status-chip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
            Assignments
          </h1>
          <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
            {role === 'student'
              ? 'View and submit your assignments'
              : 'Manage assignments and grade submissions'}
          </p>
        </div>
        {assignments.length > 0 && (
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[200px] rounded-none border-[#1A1A1A]/12 bg-white/70 text-[#4E463D] hover:border-[#C5A059]/40">
              <SelectValue placeholder="Filter by course">
                {selectedCourse === 'all'
                  ? 'All Courses'
                  : courses.find((c) => c.id === selectedCourse)?.title ||
                    'Select Course'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-none">
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

      {/* Course groups */}
      {groupedByCourse.map(({ course, assignments: courseAssignments }) => {
        if (courseAssignments.length === 0) return null

        return (
          <div key={course.id} className="space-y-4">
            <div className="flex items-baseline gap-4">
              <h3 className="font-serif text-xl text-[#1C1815]">
                {course.title}
              </h3>
              <span className="text-[0.68rem] tracking-[0.18em] text-[#8E816D] uppercase">
                {courseAssignments.length}{' '}
                {courseAssignments.length === 1 ? 'assignment' : 'assignments'}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courseAssignments.map((assignment) => {
                const overdue = isOverdue(assignment.dueDate)
                const submissionStatus = getSubmissionStatus(assignment)
                const submissionVariant =
                  submissionStatus === 'Graded'
                    ? 'graded'
                    : submissionStatus === 'Submitted'
                      ? 'submitted'
                      : submissionStatus === 'Draft'
                        ? 'draft'
                        : 'not-submitted'

                return (
                  <div
                    key={assignment.id}
                    className="group border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] transition-all hover:border-[#C5A059]/30"
                  >
                    <div className="bg-[#151515]/88 px-5 pt-5 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="mt-1 h-px w-6 shrink-0 bg-[#C5A059]/40" />
                        <StatusChip
                          variant={
                            role === 'student'
                              ? submissionVariant
                              : assignment.status
                          }
                          size="sm"
                        />
                      </div>
                      <h4 className="mt-2 font-serif text-base leading-snug text-[#F8F4EC]">
                        {assignment.title}
                      </h4>
                      <p className="mt-1 text-[0.72rem] text-[#AFA28F]">
                        {assignment.lesson.title}
                      </p>
                    </div>

                    <div className="border-t border-white/8 bg-[#151515]/88 px-5 py-3 pb-2">
                      <div className="flex items-center gap-1.5 text-[0.68rem] text-[#8E816D]">
                        <CalendarIcon className="size-3" />
                        <span
                          className={cn(overdue && 'font-medium text-red-400')}
                        >
                          Due{' '}
                          {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                        {overdue && (
                          <span className="ml-auto border border-red-400/50 px-1.5 py-0.5 text-[0.52rem] font-medium tracking-[0.15em] text-red-400 uppercase">
                            Overdue
                          </span>
                        )}
                      </div>

                      {role === 'student' ? (
                        assignment.submission?.grade !== null &&
                        assignment.submission?.grade !== undefined ? (
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                              Grade
                            </span>
                            <span className="font-serif text-sm text-[#E9D9B4]">
                              {assignment.submission.grade} /{' '}
                              {assignment.maxGrade ?? 100}
                            </span>
                          </div>
                        ) : null
                      ) : (
                        assignment.submissionStats && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                                Submitted
                              </span>
                              <span className="text-[0.72rem] font-medium text-[#CFC6B7]">
                                {assignment.submissionStats.submitted} /{' '}
                                {assignment.submissionStats.total}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                                Graded
                              </span>
                              <span className="text-[0.72rem] font-medium text-[#CFC6B7]">
                                {assignment.submissionStats.graded}
                              </span>
                            </div>
                          </div>
                        )
                      )}

                      {/* Footer action row */}
                      <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                        <span className="text-[0.68rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
                          View assignment
                        </span>

                        <Button
                          className={cn(
                            'flex size-8 cursor-pointer items-center justify-center border transition-all',
                            'border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4]',
                          )}
                          onClick={() =>
                            router.navigate({
                              to: '/assignments/$assignmentId',
                              params: { assignmentId: assignment.id },
                              search: {
                                calendarMonth: undefined,
                                fromDashboard: false,
                                fromCalendar: false,
                              },
                            })
                          }
                        >
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {filteredAssignments.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-serif text-lg text-[#AFA28F]">
            No assignments found
          </p>
          <p className="mt-1 text-sm text-[#8E816D]">
            {selectedCourse === 'all'
              ? 'There are no assignments yet'
              : 'This course has no assignments'}
          </p>
        </div>
      )}
    </div>
  )
}
