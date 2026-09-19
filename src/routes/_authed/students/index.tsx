import { createFileRoute, redirect } from '@tanstack/react-router'
import { requireTeacherOrAdminRole } from '@/utils/auth/domain/user-context.domain'
import { StudentsView } from '@/components/view/StudentsView'
import { PageLayout } from '@/components/layout/page-layout'
import { getStudents } from '@/utils/student'

export const Route = createFileRoute('/_authed/students/')({
  beforeLoad: ({ context }) => {
    const role = requireTeacherOrAdminRole(context.user?.role, () => {
      throw redirect({
        to: '/dashboard',
        search: { verified: false },
      })
    })
    return {
      role,
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
