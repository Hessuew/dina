import { useRouter } from '@tanstack/react-router'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
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

  const submissionStatusToken = (assignment: Assignment) => {
    const label = getSubmissionStatus(assignment)
    const colorMap: Record<string, string> = {
      Graded: 'border-[#C5A059]/40 text-[#9B7A41]',
      Submitted: 'border-blue-300/60 text-blue-600',
      Draft: 'border-[#1A1A1A]/12 text-[#8E816D]',
      'Not Submitted': 'border-[#1A1A1A]/10 text-[#9B8C7C]',
    }
    return { label, color: colorMap[label] ?? colorMap['Not Submitted'] }
  }

  const assignmentStatusToken = (status: string) => {
    const colorMap: Record<string, string> = {
      published: 'border-[#C5A059]/40 text-[#9B7A41]',
      closed: 'border-red-300/60 text-red-600',
      draft: 'border-[#1A1A1A]/12 text-[#8E816D]',
    }
    return colorMap[status] ?? colorMap.draft
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
          <p className="mt-1 text-sm text-[#8E816D]">
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
                const subToken = submissionStatusToken(assignment)

                return (
                  <div
                    key={assignment.id}
                    className="group cursor-pointer border border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_8px_20px_-16px_rgba(0,0,0,0.12)] transition-all hover:border-[#C5A059]/30 hover:shadow-[0_12px_28px_-16px_rgba(197,160,89,0.20)]"
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
                    <div className="px-5 pt-5 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="mt-1 h-px w-6 shrink-0 bg-[#C5A059]/40" />
                        <span
                          className={cn(
                            'shrink-0 border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase',
                            role === 'student'
                              ? subToken.color
                              : assignmentStatusToken(assignment.status),
                          )}
                        >
                          {role === 'student'
                            ? subToken.label
                            : assignment.status.charAt(0).toUpperCase() +
                              assignment.status.slice(1)}
                        </span>
                      </div>
                      <h4 className="mt-2 font-serif text-base leading-snug text-[#1C1815] group-hover:text-[#9B7A41]">
                        {assignment.title}
                      </h4>
                      <p className="mt-1 text-[0.72rem] text-[#8E816D]">
                        {assignment.lesson.title}
                      </p>
                    </div>

                    <div className="border-t border-[#1A1A1A]/8 px-5 py-3">
                      <div className="flex items-center gap-1.5 text-[0.68rem] text-[#9B8C7C]">
                        <CalendarIcon className="size-3" />
                        <span
                          className={cn(overdue && 'font-medium text-red-500')}
                        >
                          Due{' '}
                          {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                        {overdue && (
                          <span className="ml-auto border border-red-300/60 px-1.5 py-0.5 text-[0.52rem] font-medium tracking-[0.15em] text-red-500 uppercase">
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
                            <span className="font-serif text-sm text-[#1C1815]">
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
                              <span className="text-[0.72rem] font-medium text-[#4E463D]">
                                {assignment.submissionStats.submitted} /{' '}
                                {assignment.submissionStats.total}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                                Graded
                              </span>
                              <span className="text-[0.72rem] font-medium text-[#4E463D]">
                                {assignment.submissionStats.graded}
                              </span>
                            </div>
                          </div>
                        )
                      )}
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
          <p className="font-serif text-lg text-[#8E816D]">
            No assignments found
          </p>
          <p className="mt-1 text-sm text-[#9B8C7C]">
            {selectedCourse === 'all'
              ? 'There are no assignments yet'
              : 'This course has no assignments'}
          </p>
        </div>
      )}
    </div>
  )
}
