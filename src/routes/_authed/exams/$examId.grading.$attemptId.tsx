import { createFileRoute, useRouter } from '@tanstack/react-router'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { GradingView } from '@/components/exam/exam-grading/GradingView'
import { getExamAttemptForGrading } from '@/utils/exam'

export const Route = createFileRoute(
  '/_authed/exams/$examId/grading/$attemptId',
)({
  loader: ({ params }) =>
    getExamAttemptForGrading({ data: { attemptId: params.attemptId } }),
  component: ExamGradingComponent,
})

function ExamGradingComponent() {
  const { attempt, questions, options, answers } = Route.useLoaderData()
  const router = useRouter()
  const { examId } = Route.useParams()
  return (
    <PageLayout>
      <PageHeader
        title="Grade attempt"
        onBack={() =>
          void router.navigate({
            to: '/exams/$examId/grading',
            params: { examId },
          })
        }
      />
      <GradingView
        attempt={attempt}
        questions={questions}
        options={options}
        answers={answers}
      />
    </PageLayout>
  )
}
