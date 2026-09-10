import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type {
  EditorExam,
  EditorOption,
  EditorQuestion,
} from '@/components/exam/exam-editor/QuestionEditor'
import type {
  ExamMetaDraft,
  ExamQuestionDraft,
} from '@/components/exam/exam-editor/exam-editor.domain'
import {
  blankExamQuestionDraft,
  buildSaveExamInput,
  examMetaValidationMessage,
  initialExamMetaDraft,
  initialExamQuestionDraft,
} from '@/components/exam/exam-editor/exam-editor.domain'
import { useMutation } from '@/hooks/useMutation'
import { saveExamChanges } from '@/utils/exam'

type ExamEditorInput = {
  exam: EditorExam
  questions: Array<EditorQuestion>
  options: Array<EditorOption>
}

function buildQuestionDrafts(
  questions: Array<EditorQuestion>,
  options: Array<EditorOption>,
): Array<ExamQuestionDraft> {
  return questions.map((question) =>
    initialExamQuestionDraft(
      question,
      options.filter((option) => option.questionId === question.id),
    ),
  )
}

function useExamEditorDraftState({
  exam,
  questions,
  options,
}: ExamEditorInput) {
  const [meta, setMeta] = useState<ExamMetaDraft>(() =>
    initialExamMetaDraft(exam),
  )
  const [questionDrafts, setQuestionDrafts] = useState(() =>
    buildQuestionDrafts(questions, options),
  )
  const [newQuestions, setNewQuestions] = useState<Array<ExamQuestionDraft>>([])
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<Array<string>>(
    [],
  )

  useEffect(() => {
    setMeta(initialExamMetaDraft(exam))
    setQuestionDrafts(buildQuestionDrafts(questions, options))
    setNewQuestions([])
    setDeletedQuestionIds([])
  }, [exam, questions, options])

  return {
    meta,
    setMeta,
    questionDrafts,
    setQuestionDrafts,
    newQuestions,
    setNewQuestions,
    deletedQuestionIds,
    setDeletedQuestionIds,
  }
}

type ExamEditorDraftState = ReturnType<typeof useExamEditorDraftState>

function useExamEditorActions(state: ExamEditorDraftState) {
  const updateQuestion = (index: number, draft: ExamQuestionDraft) => {
    state.setQuestionDrafts((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? draft : question,
      ),
    )
  }

  const addQuestion = () => {
    state.setNewQuestions((current) => [...current, blankExamQuestionDraft()])
  }

  const updateNewQuestion = (index: number, draft: ExamQuestionDraft) => {
    state.setNewQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? draft : question,
      ),
    )
  }

  const deleteNewQuestion = (index: number) => {
    state.setNewQuestions((current) =>
      current.filter((_, questionIndex) => questionIndex !== index),
    )
  }

  const deleteQuestion = (index: number) => {
    const question = state.questionDrafts[index]
    const questionId = question.questionId
    if (questionId !== null) {
      state.setDeletedQuestionIds((current) => [
        ...current,
        ...(current.includes(questionId) ? [] : [questionId]),
      ])
    }
    state.setQuestionDrafts((current) =>
      current.filter((_, questionIndex) => questionIndex !== index),
    )
  }

  return {
    updateQuestion,
    addQuestion,
    updateNewQuestion,
    deleteNewQuestion,
    deleteQuestion,
  }
}

export function useExamEditor({ exam, questions, options }: ExamEditorInput) {
  const router = useRouter()
  const state = useExamEditorDraftState({ exam, questions, options })
  const actions = useExamEditorActions(state)
  const saveMutation = useMutation({
    fn: saveExamChanges,
    onSuccess: async () => {
      toast.success('Exam changes saved')
      await router.invalidate()
    },
  })

  const save = () => {
    const validationMessage = examMetaValidationMessage(state.meta)
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }
    void saveMutation.mutate({
      data: buildSaveExamInput({
        examId: exam.id,
        meta: state.meta,
        questions: [...state.questionDrafts, ...state.newQuestions],
        deletedQuestionIds: state.deletedQuestionIds,
      }),
    })
  }

  return {
    meta: state.meta,
    setMeta: state.setMeta,
    questionDrafts: state.questionDrafts,
    newQuestions: state.newQuestions,
    ...actions,
    save,
    saving: saveMutation.isPending,
  }
}
