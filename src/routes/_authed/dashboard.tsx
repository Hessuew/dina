import { createFileRoute } from '@tanstack/react-router'
import { CourseList } from '@/components/CourseList'
import {
  getAllAssignmentsForStudent,
  getAllAssignmentsForTeacher,
} from '@/utils/assignments'
import { getCourses, getUpcomingLessons } from '@/utils/courses'

export const Route = createFileRoute('/_authed/dashboard')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      verified: search.verified === 'true',
    }
  },
  loader: async () => {
    const coursesData = await getCourses()

    const transformedCourses = coursesData.courses.map((course) => ({
      ...course,
      isPublished: course.isPublished ?? false,
    }))

    let assignmentsData
    if (coursesData.role === 'student') {
      assignmentsData = await getAllAssignmentsForStudent()
    } else {
      assignmentsData = await getAllAssignmentsForTeacher()
    }

    const upcomingLessonsData = await getUpcomingLessons()

    return {
      courses: transformedCourses,
      role: coursesData.role,
      assignments: assignmentsData.assignments,
      upcomingLessons: upcomingLessonsData.lessons,
    }
  },
  component: DashboardComponent,
})

function DashboardComponent() {
  const { courses, role, assignments, upcomingLessons } = Route.useLoaderData()
  const { verified } = Route.useSearch()

  return (
    <div className="mx-auto max-w-7xl p-6">
      {verified && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <div className="font-semibold">✓ Email verified successfully!</div>
          <div className="mt-1 text-xs text-green-700">
            Welcome to your dashboard. You're all set to get started!
          </div>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {role === 'teacher'
            ? 'Manage your courses and assignments'
            : 'View your courses and assignments'}
        </p>
      </div>

      <CourseList
        courses={courses}
        assignments={assignments}
        lessons={upcomingLessons}
        role={role}
      />
    </div>
  )
}
