import { createFileRoute } from '@tanstack/react-router'
import { CourseList } from '@/components/list/CourseList'
import { OpenAttendanceBanner } from '@/components/dashboard/OpenAttendanceBanner'
import { PageLayout } from '@/components/layout/page-layout'
import {
  getAllAssignmentsForStudent,
  getAllAssignmentsForTeacher,
} from '@/utils/assignments/assignments'
import { getCourses, getUpcomingLessons } from '@/utils/courses'
import { getDashboardAssignmentScope } from '@/components/dashboard/dashboard.domain'

export const Route = createFileRoute('/_authed/dashboard')({
  loader: async () => {
    const coursesData = await getCourses()

    const transformedCourses = coursesData.courses.map((course) => ({
      ...course,
      isPublished: course.isPublished ?? false,
    }))

    const [assignmentsData, upcomingLessonsData] = await Promise.all([
      coursesData.role === 'student'
        ? getAllAssignmentsForStudent()
        : getAllAssignmentsForTeacher({
            data: { scope: getDashboardAssignmentScope(coursesData.role) },
          }),
      getUpcomingLessons(),
    ])

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
    <PageLayout>
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

      {role === 'student' && <OpenAttendanceBanner />}

      <CourseList
        courses={courses}
        assignments={assignments}
        lessons={upcomingLessons}
        role={role}
      />
    </PageLayout>
  )
}
