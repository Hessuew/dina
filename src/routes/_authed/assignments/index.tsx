import { createFileRoute } from '@tanstack/react-router'
import { AssignmentsView } from '@/components/view/AssignmentsView'
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
    <div className="mx-auto w-full max-w-7xl p-6">
      <AssignmentsView assignments={assignments} role={role} />
    </div>
  )
}
