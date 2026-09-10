import type {
  TakingAnswer,
  TakingOption,
  TakingQuestion,
} from '@/components/exam/exam-taking/ExamTakingView'
import { GradedMcAnswerRow } from '@/components/exam/exam-grading/GradedMcAnswerRow'
import { OpenAnswerGradeRow } from '@/components/exam/exam-grading/OpenAnswerGradeRow'

type StudentExamReviewProps = {
  questions: Array<TakingQuestion>
  options: Array<TakingOption>
  answers: Array<TakingAnswer>
}

export function StudentExamReview({
  questions,
  options,
  answers,
}: StudentExamReviewProps) {
  const answerByQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  )
  return (
    <div className="w-full space-y-6 text-left">
      {questions.map((question, index) => {
        const answer = answerByQuestion.get(question.id)
        if (question.type === 'multiple_choice') {
          return (
            <GradedMcAnswerRow
              key={question.id}
              index={index}
              question={question}
              options={options
                .filter((option) => option.questionId === question.id)
                .map((option) => ({
                  ...option,
                  isCorrect: option.isCorrect === true,
                }))}
              answer={answer}
            />
          )
        }
        return (
          <OpenAnswerGradeRow
            key={question.id}
            index={index}
            question={question}
            answer={answer}
            readOnly
          />
        )
      })}
    </div>
  )
}
