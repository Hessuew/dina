import { createFileRoute } from '@tanstack/react-router'
import { PageLayout } from '@/components/layout/page-layout'
import { ExamsView } from '@/components/view/exams-view/ExamsView'
import { getExamsForStudent, getExamsForTeacher } from '@/utils/exam'
import { getCourses } from '@/utils/courses'

export const Route = createFileRoute('/_authed/exams/')({
  loader: async () => {
    const coursesData = await getCourses()
    if (coursesData.role === 'student') {
      return {
        role: coursesData.role,
        teacherExams: [],
        studentItems: await getExamsForStudent(),
      }
    }
    return {
      role: coursesData.role,
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
