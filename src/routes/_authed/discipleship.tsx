import { createFileRoute, redirect } from '@tanstack/react-router'
import { DiscipleshipBoard } from '@/components/discipleship/DiscipleshipBoard'
import { PageLayout } from '@/components/layout/page-layout'
import { getCourses } from '@/utils/courses'
import { getDiscipleshipBoard } from '@/utils/discipleship'

export const Route = createFileRoute('/_authed/discipleship')({
  beforeLoad: async () => {
    const coursesData = await getCourses()
    const isTeacherOrAdmin =
      coursesData.role === 'teacher' || coursesData.role === 'admin'

    if (!isTeacherOrAdmin) {
      throw redirect({ to: '/dashboard', search: { verified: false } })
    }

    return { role: coursesData.role }
  },
  loader: async () => {
    const board = await getDiscipleshipBoard()
    return { board }
  },
  component: DiscipleshipComponent,
})

function DiscipleshipComponent() {
  const { board } = Route.useLoaderData()

  return (
    <PageLayout>
      <div className="mb-6">
        <h1 className="font-serif text-2xl tracking-[-0.01em] text-[#2B2417]">
          Discipleship
        </h1>
        <p className="mt-1 text-sm text-[#6B5E4C]">
          Arrange students under teachers, pair them up, and set monthly
          discipleship times. Drag a student onto a teacher to assign, or onto
          another student to pair them.
        </p>
      </div>
      <DiscipleshipBoard data={board} />
    </PageLayout>
  )
}
