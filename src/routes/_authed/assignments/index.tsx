import { createFileRoute } from '@tanstack/react-router'
import { AssignmentsView } from '@/components/view/AssignmentsView'
import { PageLayout } from '@/components/layout/page-layout'
import {
  getAllAssignmentsForStudent,
  getAllAssignmentsForTeacher,
} from '@/utils/assignments'
import { getCourses } from '@/utils/courses'

export const Route = createFileRoute('/_authed/assignments/')({
  loader: async () => {
    const coursesData = await getCourses()

    let assignmentsData
    if (coursesData.role === 'student') {
      assignmentsData = await getAllAssignmentsForStudent()
    } else {
      assignmentsData = await getAllAssignmentsForTeacher()
    }

    return {
      assignments: assignmentsData.assignments,
      role: coursesData.role,
    }
  },
  component: AssignmentsComponent,
})

function AssignmentsComponent() {
  const { assignments, role } = Route.useLoaderData()

  return (
    <PageLayout>
      <AssignmentsView assignments={assignments} role={role} />
    </PageLayout>
  )
}
