import { createFileRoute } from '@tanstack/react-router'
import { DiscipleshipBoard } from '@/components/discipleship/DiscipleshipBoard'
import { StudentDiscipleshipView } from '@/components/discipleship/student-view/StudentDiscipleshipView'
import { PageLayout } from '@/components/layout/page-layout'
import {
  getDiscipleshipBoard,
  getStudentDiscipleshipView,
} from '@/utils/discipleship'

export const Route = createFileRoute('/_authed/discipleship')({
  // Role already on root context.user — no getCourses() catalog just for branch.
  loader: async ({ context }) => {
    if (context.user?.role === 'student') {
      const view = await getStudentDiscipleshipView()
      return { mode: 'student' as const, view }
    }
    const board = await getDiscipleshipBoard()
    return { mode: 'staff' as const, board }
  },
  component: DiscipleshipComponent,
})

function StaffPage({
  board,
}: {
  board: Awaited<ReturnType<typeof getDiscipleshipBoard>>
}) {
  return (
    <>
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
    </>
  )
}

function StudentPage({
  view,
}: {
  view: Awaited<ReturnType<typeof getStudentDiscipleshipView>>
}) {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-serif text-2xl tracking-[-0.01em] text-[#2B2417]">
          Discipleship
        </h1>
        <p className="mt-1 text-sm text-[#6B5E4C]">
          Your teacher, monthly meeting times, and classmates under the same
          discipler.
        </p>
      </div>
      <StudentDiscipleshipView view={view} />
    </>
  )
}

function DiscipleshipComponent() {
  const data = Route.useLoaderData()

  return (
    <PageLayout>
      {data.mode === 'staff' ? (
        <StaffPage board={data.board} />
      ) : (
        <StudentPage view={data.view} />
      )}
    </PageLayout>
  )
}
