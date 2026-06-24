import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import type { Assignment } from '@/components/view/assignments-view/AssignmentsView'
import { UpcomingAssignmentsList } from '@/components/list/upcoming-assignments-list/UpcomingAssignmentsList'
import { CourseCard } from '@/components/card/course-card/CourseCard'
import { CourseDialog } from '@/components/dialog/course-dialog/CourseDialog'
import { Button } from '@/components/ui/button'
import { UpcomingLessonsList } from '@/components/list/UpcomingLessonsList'
import { buildCourseListViewModel } from '@/components/list/domain/course-list.domain'

type Course = {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  isPublished: boolean
  lessons: Array<{ id: string }>
  teacher?: {
    fullName: string
  }
  courseTeachers?: Array<{
    teacher: {
      id: string
      fullName: string
      avatarUrl?: string | null
    }
  }>
  submittedAssignments?: number
  gradedAssignments?: number
  totalAssignments?: number
  orderIndex: number | null
}

type CourseListProps = {
  courses: Array<Course>
  role: 'student' | 'teacher' | 'admin'
  assignments: Array<Assignment>
  lessons: Array<{
    id: string
    title: string
    scheduledTime: Date
    thumbnailUrl: string | null
    courseId: string
    courseName: string
  }>
}

function CourseListInternal({
  courses,
  role,
}: Omit<CourseListProps, 'assignments' | 'lessons'>) {
  const { isAdmin, isTeacher, emptyHeading, emptyDescription } =
    buildCourseListViewModel(role)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  if (courses.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center border border-dashed border-[#1A1A1A]/20 bg-[#EDE8DE]/40 p-12 text-center">
          <h3 className="font-serif text-lg text-[#1C1815]">{emptyHeading}</h3>
          <p className="mt-2 text-sm text-[#5E5549]">{emptyDescription}</p>
          {isAdmin && (
            <Button
              theme="light"
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              <PlusIcon className="size-4" />
              Create Course
            </Button>
          )}
        </div>

        <CourseDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          mode="create"
          isAdmin={isAdmin}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {isTeacher && (
          <div className="flex justify-end">
            <Button theme="light" onClick={() => setShowCreateDialog(true)}>
              <PlusIcon className="size-4" />
              Create Course
            </Button>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} role={role} />
          ))}
        </div>
      </div>

      <CourseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        mode="create"
        isAdmin={isAdmin}
      />
    </>
  )
}

export function CourseList({
  courses,
  role,
  assignments,
  lessons,
}: CourseListProps) {
  return (
    <div className="grid gap-12 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <CourseListInternal courses={courses} role={role} />
      </div>

      <div className="space-y-6">
        <UpcomingLessonsList lessons={lessons} />
        <UpcomingAssignmentsList assignments={assignments} role={role} />
      </div>
    </div>
  )
}
