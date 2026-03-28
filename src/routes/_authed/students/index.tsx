import { createFileRoute, redirect } from '@tanstack/react-router'
import { StudentsView } from '@/components/StudentsView'
import { getStudents } from '@/utils/students'
import { getCourses } from '@/utils/courses'

export const Route = createFileRoute('/_authed/students/')({
  beforeLoad: async () => {
    const coursesData = await getCourses()
    const isTeacherOrAdmin =
      coursesData.role === 'teacher' || coursesData.role === 'admin'

    if (!isTeacherOrAdmin) {
      throw redirect({
        to: '/dashboard',
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
    <div className="mx-auto max-w-7xl p-6 w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Students</h1>
        <p className="text-muted-foreground mt-1">
          Manage your students and their progress
        </p>
      </div>

      <StudentsView students={students} />
    </div>
  )
}
