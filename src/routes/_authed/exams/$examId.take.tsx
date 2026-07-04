import { createFileRoute, useRouter } from '@tanstack/react-router'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { ExamTakingView } from '@/components/exam/exam-taking/ExamTakingView'
import { getExamAttemptForTaking } from '@/utils/exam'

export const Route = createFileRoute('/_authed/exams/$examId/take')({
  loader: ({ params }) =>
    getExamAttemptForTaking({ data: { examId: params.examId } }),
  component: ExamTakeComponent,
})

function ExamTakeComponent() {
  const payload = Route.useLoaderData()
  const router = useRouter()
  return (
    <PageLayout>
      <PageHeader
        title="Exam"
        onBack={() => void router.navigate({ to: '/exams' })}
      />
      <ExamTakingView
        attempt={payload.attempt}
        questions={payload.questions}
        options={payload.options}
        answers={payload.answers}
        serverNow={payload.serverNow}
      />
    </PageLayout>
  )
}
