import { useState } from 'react'
import type {
  TakingAnswer,
  TakingOption,
  TakingQuestion,
} from '@/components/exam/exam-taking/ExamTakingView'
import type { AnswerPayload, SaveState } from '@/hooks/useAnswerAutosave'
import { McQuestion } from '@/components/exam/exam-taking/McQuestion'
import { OpenQuestion } from '@/components/exam/exam-taking/OpenQuestion'
import { AnswerSaveIndicator } from '@/components/exam/exam-taking/AnswerSaveIndicator'
import {
  selectedOptionOf,
  textValueOf,
} from '@/components/exam/exam-taking/question-runner.domain'

type QuestionRunnerProps = {
  questions: Array<TakingQuestion>
  options: Array<TakingOption>
  initialAnswers: Array<TakingAnswer>
  queueSave: (
    questionId: string,
    payload: AnswerPayload,
    debounceMs: number,
  ) => void
  saveStates: Record<string, SaveState>
}

export function QuestionRunner({
  questions,
  options,
  initialAnswers,
  queueSave,
  saveStates,
}: QuestionRunnerProps) {
  const [answers, setAnswers] = useState<
    Record<string, AnswerPayload | undefined>
  >(() =>
    Object.fromEntries(
      initialAnswers.map((answer) => [
        answer.questionId,
        {
          selectedOptionId: answer.selectedOptionId ?? undefined,
          textAnswer: answer.textAnswer ?? undefined,
        },
      ]),
    ),
  )

  const answerQuestion = (
    questionId: string,
    payload: AnswerPayload,
    debounceMs: number,
  ) => {
    setAnswers((current) => ({ ...current, [questionId]: payload }))
    queueSave(questionId, payload, debounceMs)
  }

  return (
    <div className="space-y-6">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          options={options}
          answer={answers[question.id]}
          saveState={saveStates[question.id]}
          onAnswer={answerQuestion}
        />
      ))}
    </div>
  )
}

function QuestionCard({
  question,
  index,
  options,
  answer,
  saveState,
  onAnswer,
}: {
  question: TakingQuestion
  index: number
  options: Array<TakingOption>
  answer: AnswerPayload | undefined
  saveState: SaveState | undefined
  onAnswer: (
    questionId: string,
    payload: AnswerPayload,
    debounceMs: number,
  ) => void
}) {
  return (
    <div className="space-y-4 border border-[#1A1A1A]/10 bg-white/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-lg text-[#1C1815]">
          {index + 1}. {question.prompt}
        </p>
        <AnswerSaveIndicator state={saveState} />
      </div>
      {question.type === 'multiple_choice' ? (
        <McQuestion
          questionId={question.id}
          options={options.filter((o) => o.questionId === question.id)}
          selectedOptionId={selectedOptionOf(answer)}
          onSelect={(selectedOptionId) =>
            onAnswer(question.id, { selectedOptionId }, 0)
          }
        />
      ) : (
        <OpenQuestion
          value={textValueOf(answer)}
          onChange={(textAnswer) => onAnswer(question.id, { textAnswer }, 800)}
        />
      )}
    </div>
  )
}
