import { createFileRoute } from '@tanstack/react-router'
import { CourseList } from '@/components/CourseList'
import {
  getAllAssignmentsForStudent,
  getAllAssignmentsForTeacher,
} from '@/utils/assignments'
import { getCourses, getUpcomingLessons } from '@/utils/courses'

export const Route = createFileRoute('/_authed/dashboard')({
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

  return (
    <div className="mx-auto max-w-7xl p-6">
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
