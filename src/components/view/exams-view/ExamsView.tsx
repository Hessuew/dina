import { Link } from '@tanstack/react-router'
import type {
  ExamAttemptStatus,
  ExamStatus,
} from '@/utils/exam/domain/exam-lifecycle.domain'
import { StatusChip } from '@/components/ui/status-chip'
import {
  STUDENT_EXAM_ACTION_LABELS,
  STUDENT_EXAM_CARD_LABELS,
  deriveStudentExamCardState,
  formatExamWindow,
  studentExamCardAction,
} from '@/components/view/exams-view/exams-view.domain'
import { CreateExamForm } from '@/components/view/exams-view/CreateExamForm'
import { Button } from '@/components/ui/button'

export type TeacherExamListItem = {
  id: string
  title: string
  status: ExamStatus
  durationMinutes: number
  opensAt: Date
  closesAt: Date
}

export type StudentExamItem = {
  exam: {
    id: string
    title: string
    durationMinutes: number
    opensAt: Date
    closesAt: Date
  }
  attempt: { status: ExamAttemptStatus } | null
}

type ExamsViewProps = {
  role: 'student' | 'teacher' | 'admin'
  teacherExams: Array<TeacherExamListItem>
  studentItems: Array<StudentExamItem>
}

export function ExamsView({ role, teacherExams, studentItems }: ExamsViewProps) {
  return (
    <div className="space-y-10">
      <div>
        <div className="h-px w-10 bg-[#C5A059]/50" />
        <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
          Exams
        </h1>
        <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
          {role === 'student'
            ? 'Your timed exams'
            : 'Create and manage timed exams'}
        </p>
      </div>
      {role === 'student' ? (
        <StudentExamList items={studentItems} />
      ) : (
        <TeacherExamList exams={teacherExams} />
      )}
    </div>
  )
}

function TeacherExamList({ exams }: { exams: Array<TeacherExamListItem> }) {
  return (
    <div className="space-y-8">
      <CreateExamForm />
      <div className="space-y-3">
        {exams.map((exam) => (
          <TeacherExamRow key={exam.id} exam={exam} />
        ))}
        {exams.length === 0 && (
          <p className="py-8 text-center font-serif text-lg text-[#AFA28F]">
            No exams yet
          </p>
        )}
      </div>
    </div>
  )
}

function TeacherExamRow({ exam }: { exam: TeacherExamListItem }) {
  return (
    <Link
      to="/exams/$examId"
      params={{ examId: exam.id }}
      className="flex items-center justify-between gap-4 border border-[#1A1A1A]/10 bg-white/70 px-5 py-4 transition-colors hover:border-[#C5A059]/40"
    >
      <div>
        <p className="font-serif text-lg text-[#1C1815]">{exam.title}</p>
        <p className="mt-1 text-xs text-[#8E816D]">
          {formatExamWindow(exam.opensAt, exam.closesAt)} ·{' '}
          {exam.durationMinutes} min
        </p>
      </div>
      <StatusChip variant={exam.status} />
    </Link>
  )
}

function StudentExamList({ items }: { items: Array<StudentExamItem> }) {
  if (items.length === 0) {
    return (
      <p className="py-16 text-center font-serif text-lg text-[#AFA28F]">
        No exams available
      </p>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <StudentExamCard key={item.exam.id} item={item} />
      ))}
    </div>
  )
}

function StudentExamCard({ item }: { item: StudentExamItem }) {
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
    <div className="space-y-4 border border-[#1A1A1A]/10 bg-white/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-lg text-[#1C1815]">{item.exam.title}</p>
        <span className="inline-block shrink-0 border border-[#C5A059]/40 px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase">
          {STUDENT_EXAM_CARD_LABELS[state]}
        </span>
      </div>
      <p className="text-xs text-[#8E816D]">
        {formatExamWindow(item.exam.opensAt, item.exam.closesAt)} ·{' '}
        {item.exam.durationMinutes} min
      </p>
      {action !== null && (
        <Button
          size="sm"
          render={<Link to="/exams/$examId" params={{ examId: item.exam.id }} />}
        >
          {STUDENT_EXAM_ACTION_LABELS[action]}
        </Button>
      )}
    </div>
  )
}
