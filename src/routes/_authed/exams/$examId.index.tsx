import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { StudentExamItem } from '@/components/view/exams-view/ExamsView'
import type { StudentExamCardState } from '@/components/view/exams-view/exams-view.domain'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { ExamEditorView } from '@/components/exam/exam-editor/ExamEditorView'
import {
  deriveStudentCardViewModel,
  startExamButtonLabel,
  studentLandingClosedMessage,
  studentLandingGoLabel,
} from '@/components/view/exams-view/exams-view.domain'
import { Button } from '@/components/ui/button'
import { useMutation } from '@/hooks/useMutation'
import {
  getExamForAuthor,
  getExamsForStudent,
  startExamAttempt,
} from '@/utils/exam'
import { getCourses } from '@/utils/courses'

export const Route = createFileRoute('/_authed/exams/$examId/')({
  loader: async ({ params }) => {
    const coursesData = await getCourses()
    if (coursesData.role === 'student') {
      const items = await getExamsForStudent()
      const item =
        items.find((candidate) => candidate.exam.id === params.examId) ?? null
      return { role: coursesData.role, item, authorData: null }
    }
    const authorData = await getExamForAuthor({
      data: { examId: params.examId },
    })
    return { role: coursesData.role, item: null, authorData }
  },
  component: ExamDetailComponent,
})

function ExamDetailComponent() {
  const { role, item, authorData } = Route.useLoaderData()
  const router = useRouter()
  const title =
    role === 'student' ? (item?.exam.title ?? 'Exam') : authorData.exam.title
  return (
    <PageLayout>
      <PageHeader
        title={title}
        onBack={() => void router.navigate({ to: '/exams' })}
      />
      {role === 'student' ? (
        <StudentExamLanding item={item} />
      ) : (
        <ExamEditorView
          exam={authorData.exam}
          questions={authorData.questions}
          options={authorData.options}
          attemptCount={authorData.attemptCount}
          canEdit={authorData.canEdit}
        />
      )}
    </PageLayout>
  )
}

function StudentExamLanding({ item }: { item: StudentExamItem | null }) {
  if (!item) {
    return (
      <p className="py-16 text-center font-serif text-lg text-[#AFA28F]">
        Exam not found
      </p>
    )
  }
  return <StudentExamLandingContent item={item} />
}

function StudentExamLandingContent({ item }: { item: StudentExamItem }) {
  const navigate = useNavigate()
  const startMutation = useMutation({
    fn: startExamAttempt,
    onSuccess: async () => {
      toast.success('Exam started — good luck!')
      await navigate({
        to: '/exams/$examId/take',
        params: { examId: item.exam.id },
      })
    },
  })
  const vm = deriveStudentCardViewModel(item, new Date())
  return (
    <div className="space-y-6 border border-[#1A1A1A]/10 bg-white/70 p-8 text-center">
      <p className="text-sm text-[#8E816D]">
        {vm.windowLabel} · {vm.durationMinutes} minutes · {vm.stateLabel}
      </p>
      {vm.scoreDisplay !== null && (
        <StudentGradedScoreBox scoreText={vm.scoreDisplay} />
      )}
      <StudentLandingAction
        state={vm.state}
        action={vm.action}
        durationMinutes={vm.durationMinutes}
        starting={startMutation.isPending}
        onStart={() =>
          void startMutation.mutate({ data: { examId: item.exam.id } })
        }
        onGo={() =>
          void navigate({
            to: '/exams/$examId/take',
            params: { examId: item.exam.id },
          })
        }
      />
    </div>
  )
}

function StudentGradedScoreBox({ scoreText }: { scoreText: string }) {
  return (
    <div className="border border-[#C5A059]/30 bg-[#F8F4EC]/80 p-5">
      <p className="text-xs tracking-wider text-[#8E816D] uppercase">
        Final Grade
      </p>
      <p className="mt-1 font-serif text-3xl text-[#1C1815]">
        Score: <span className="font-semibold text-[#9B7A41]">{scoreText}</span>
      </p>
    </div>
  )
}

function StudentLandingAction({
  state,
  action,
  durationMinutes,
  starting,
  onStart,
  onGo,
}: {
  state: StudentExamCardState
  action: 'start' | 'continue' | 'review' | null
  durationMinutes: number
  starting: boolean
  onStart: () => void
  onGo: () => void
}) {
  if (action === 'start') {
    return (
      <div className="space-y-4">
        <div className="border border-[#C5A059]/20 bg-[#F8F4EC]/50 p-4 text-left text-xs leading-relaxed text-[#5C5346]">
          <p className="font-semibold text-[#1C1815]">Before you begin:</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>
              You have <strong>{durationMinutes} minutes</strong> from the
              moment you click Start.
            </li>
            <li>
              The timer runs continuously — closing the browser will not pause
              it.
            </li>
            <li>Answers are saved automatically as you work.</li>
            <li>
              Submit when finished, or answers submit automatically at deadline.
            </li>
          </ul>
        </div>
        <Button disabled={starting} onClick={onStart}>
          {startExamButtonLabel(starting)}
        </Button>
      </div>
    )
  }
  if (action !== null) {
    return <Button onClick={onGo}>{studentLandingGoLabel(action)}</Button>
  }
  return (
    <p className="text-sm text-[#8E816D]">
      {studentLandingClosedMessage(state)}
    </p>
  )
}
