export type ExamInstructionItem = {
  id: string
  title: string
  description: string
}

export const STANDARD_EXAM_INSTRUCTIONS: ReadonlyArray<ExamInstructionItem> = [
  {
    id: 'duration',
    title: 'Timed sitting',
    description:
      'Once started, your attempt timer begins immediately according to the allotted duration and cannot be paused.',
  },
  {
    id: 'timer',
    title: 'Continuous timer',
    description:
      'Closing your browser or navigating away does not pause the clock. Return before time expires to finish.',
  },
  {
    id: 'autosave',
    title: 'Automatic answer saving',
    description:
      'Every answer is saved to the server as you select or write it. You can change your answers anytime before submitting.',
  },
  {
    id: 'submission',
    title: 'Submission & auto-submission',
    description:
      'Click Submit exam when finished. If your time runs out, all saved answers are submitted automatically.',
  },
  {
    id: 'grading',
    title: 'Grading & results',
    description:
      'Multiple-choice questions are auto-graded upon submission. Open questions are reviewed by your teacher before final scores are published.',
  },
]
