import { createFileRoute } from '@tanstack/react-router'
import { TeachersView } from '@/components/TeachersView'
import { getTeachers } from '@/utils/teachers'

export const Route = createFileRoute('/_authed/teachers')({
  loader: async () => {
    const result = await getTeachers()
    return {
      teachers: result.teachers,
    }
  },
  component: TeachersComponent,
})

function TeachersComponent() {
  const { teachers } = Route.useLoaderData()

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Teachers</h1>
        <p className="text-muted-foreground mt-1">
          View all teachers and their courses
        </p>
      </div>

      <TeachersView teachers={teachers} />
    </div>
  )
}
