import { useEffect, useState } from 'react'
import type { AssignmentStatus, SubmissionStatus } from '@/types/database.types'
import {
  buildAssignmentsCourseView,
  getAssignmentsSubtitle,
  getSelectedCourseLabel,
} from '@/components/view/domain/assignments-view.domain'
import { AssignmentCard } from '@/components/view/AssignmentCard'
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
  status: AssignmentStatus
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
    status: SubmissionStatus
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
  const [selectedCourse, setSelectedCourse] = useState<string>('all')

  const { courses, filteredAssignments, groupedByCourse } =
    buildAssignmentsCourseView(assignments, selectedCourse)

  useEffect(() => {
    if (selectedCourse === 'all') return
    const courseIds = new Set(assignments.map((a) => a.lesson.course.id))
    if (!courseIds.has(selectedCourse)) setSelectedCourse('all')
  }, [assignments, selectedCourse])

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
            {getAssignmentsSubtitle(role)}
          </p>
        </div>
        {assignments.length > 0 && (
          <Select
            value={selectedCourse}
            onValueChange={(value) => setSelectedCourse(value ?? 'all')}
          >
            <SelectTrigger className="w-[200px] rounded-none border-[#1A1A1A]/12 bg-white/70 text-[#4E463D] hover:border-[#C5A059]/40">
              <SelectValue placeholder="Filter by course">
                {getSelectedCourseLabel(selectedCourse, courses)}
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
              {courseAssignments.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  role={role}
                />
              ))}
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
