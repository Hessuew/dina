import { createFileRoute } from '@tanstack/react-router'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { CourseList } from '@/components/list/CourseList'
import {
  getAllAssignmentsForStudent,
  getAllAssignmentsForTeacher,
} from '@/utils/assignments/assignments'
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
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
        <div className="mb-10">
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
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
    </div>
  )
}
