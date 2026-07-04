import { createFileRoute, useRouter } from '@tanstack/react-router'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { GradingAttemptsList } from '@/components/exam/exam-grading/GradingAttemptsList'
import { listExamAttemptsForGrading } from '@/utils/exam'

export const Route = createFileRoute('/_authed/exams/$examId/grading/')({
  loader: ({ params }) =>
    listExamAttemptsForGrading({ data: { examId: params.examId } }),
  component: ExamGradingListComponent,
})

function ExamGradingListComponent() {
  const attempts = Route.useLoaderData()
  const router = useRouter()
  const { examId } = Route.useParams()
  return (
    <PageLayout>
      <PageHeader
        title="Exam attempts"
        onBack={() =>
          void router.navigate({ to: '/exams/$examId', params: { examId } })
        }
      />
      <GradingAttemptsList attempts={attempts} />
    </PageLayout>
  )
}
