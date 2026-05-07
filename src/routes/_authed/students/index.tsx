import { createFileRoute, redirect } from '@tanstack/react-router'
import { StudentsView } from '@/components/view/StudentsView'
import { PageLayout } from '@/components/layout/page-layout'
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
    <PageLayout>
      <StudentsView students={students} />
    </PageLayout>
  )
}
