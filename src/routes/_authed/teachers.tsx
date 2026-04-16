import { createFileRoute } from '@tanstack/react-router'
import { TeachersView } from '@/components/view/TeachersView'
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
      <TeachersView teachers={teachers} />
    </div>
  )
}
