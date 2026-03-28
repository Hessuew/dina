import { Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { CourseCard } from './CourseCard'
import { Button } from '@/components/ui/button'

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
  completedLessons?: number
  totalLessons?: number
}

type CourseListProps = {
  courses: Array<Course>
  role: 'student' | 'teacher' | 'admin'
}

export function CourseList({ courses, role }: CourseListProps) {
  const isTeacher = role === 'teacher'

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="mb-2 text-lg font-semibold">
          {isTeacher ? 'No courses yet' : 'No enrolled courses'}
        </h3>
        <p className="text-muted-foreground mb-4 text-sm">
          {isTeacher
            ? 'Create your first course to get started'
            : 'You are not enrolled in any courses yet'}
        </p>
        {isTeacher && (
          <Button render={<Link to="/courses/new" />}>
            <PlusIcon className="size-4" />
            Create Course
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="flex justify-end">
          <Button render={<Link to="/courses/new" />}>
            <PlusIcon className="size-4" />
            Create Course
          </Button>
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} role={role} />
        ))}
      </div>
    </div>
  )
}
