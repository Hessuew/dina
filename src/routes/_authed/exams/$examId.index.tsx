import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { StudentExamItem } from '@/components/view/exams-view/ExamsView'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { ExamEditorView } from '@/components/exam/exam-editor/ExamEditorView'
import {
  STUDENT_EXAM_CARD_LABELS,
  deriveStudentExamCardState,
  formatExamWindow,
  startExamButtonLabel,
  studentExamCardAction,
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
        />
      )}
    </PageLayout>
  )
}

function StudentExamLanding({ item }: { item: StudentExamItem | null }) {
  const navigate = useNavigate()
  const startMutation = useMutation({
    fn: startExamAttempt,
    onSuccess: async () => {
      toast.success('Exam started — good luck!')
      await navigate({
        to: '/exams/$examId/take',
        params: { examId: item!.exam.id },
      })
    },
  })
  if (!item) {
    return (
      <p className="py-16 text-center font-serif text-lg text-[#AFA28F]">
        Exam not found
      </p>
    )
  }
  const state = deriveStudentExamCardState(
    {
      opensAt: item.exam.opensAt,
      closesAt: item.exam.closesAt,
      attemptStatus: item.attempt?.status ?? null,
    },
    new Date(),
  )
  const action = studentExamCardAction(state)
  return (
    <div className="space-y-6 border border-[#1A1A1A]/10 bg-white/70 p-8 text-center">
      <p className="text-sm text-[#8E816D]">
        {formatExamWindow(item.exam.opensAt, item.exam.closesAt)} ·{' '}
        {item.exam.durationMinutes} minutes · {STUDENT_EXAM_CARD_LABELS[state]}
      </p>
      <StudentLandingAction
        state={state}
        action={action}
        durationMinutes={item.exam.durationMinutes}
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

function StudentLandingAction({
  state,
  action,
  durationMinutes,
  starting,
  onStart,
  onGo,
}: {
  state: ReturnType<typeof deriveStudentExamCardState>
  action: ReturnType<typeof studentExamCardAction>
  durationMinutes: number
  starting: boolean
  onStart: () => void
  onGo: () => void
}) {
  if (action === 'start') {
    return (
      <>
        <p className="text-sm text-[#4E463D]">
          You have {durationMinutes} minutes from the moment you start. Your
          answers are saved automatically — if the tab closes, return here to
          continue where you left off.
        </p>
        <Button disabled={starting} onClick={onStart}>
          {startExamButtonLabel(starting)}
        </Button>
      </>
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
