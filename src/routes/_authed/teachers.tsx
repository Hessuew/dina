import { createFileRoute } from '@tanstack/react-router'
import { TeachersView } from '@/components/view/TeachersView'
import { PageLayout } from '@/components/layout/page-layout'
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
    <PageLayout>
      <TeachersView teachers={teachers} />
    </PageLayout>
  )
}
