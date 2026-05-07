import { createFileRoute, redirect } from '@tanstack/react-router'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { StudentsView } from '@/components/view/StudentsView'
import { getStudents } from '@/utils/student'
import { getCourses } from '@/utils/courses'

export const Route = createFileRoute('/_authed/students/')({
  beforeLoad: async () => {
    const coursesData = await getCourses()
    const isTeacherOrAdmin =
      coursesData.role === 'teacher' || coursesData.role === 'admin'

    if (!isTeacherOrAdmin) {
      throw redirect({
        to: '/dashboard',
        search: {
          verified: false,
        },
      })
    }

    return {
      role: coursesData.role,
    }
  },
  loader: async () => {
    const result = await getStudents()
    return {
      students: result.students,
    }
  },
  component: StudentsComponent,
})

function StudentsComponent() {
  const { students } = Route.useLoaderData()

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
        <StudentsView students={students} />
      </div>
    </div>
  )
}
