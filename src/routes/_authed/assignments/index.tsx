import { createFileRoute } from '@tanstack/react-router'
import { AssignmentsView } from '@/components/AssignmentsView'
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
    <div className="mx-auto max-w-7xl p-6 w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Assignments</h1>
        <p className="text-muted-foreground mt-1">
          {role === 'teacher'
            ? 'Manage your assignments'
            : 'View your assignments'}
        </p>
      </div>

      <AssignmentsView assignments={assignments} role={role} />
    </div>
  )
}
