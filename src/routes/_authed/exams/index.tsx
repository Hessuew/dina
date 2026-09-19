import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '@/components/layout/page-layout'
import { ExamsView } from '@/components/view/exams-view/ExamsView'
import { getExamsForStudent, getExamsForTeacher } from '@/utils/exam'

export const Route = createFileRoute('/_authed/exams/')({
  loader: async ({ context }) => {
    const role = context.user?.role ?? 'student'
    if (role === 'student') {
      return {
        role,
        teacherExams: [],
        studentItems: await getExamsForStudent(),
      }
    }
    return {
      role,
      teacherExams: await getExamsForTeacher(),
      studentItems: [],
    }
  },
  component: ExamsComponent,
})

function ExamsComponent() {
  const { role, teacherExams, studentItems } = Route.useLoaderData()
  return (
    <PageLayout>
      <ExamsView
        role={role}
        teacherExams={teacherExams}
        studentItems={studentItems}
      />
    </PageLayout>
  )
}
