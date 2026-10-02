import { describe, expect, it } from 'vitest'
import { submittedPanelView } from './submitted-panel.domain'

describe('submittedPanelView', () => {
  it('hides the score until the attempt is graded', () => {
    expect(
      submittedPanelView(
        { status: 'submitted', totalScore: null, feedback: null },
        10,
      ),
    ).toEqual({ heading: 'Exam submitted', scoreText: null, feedback: null })
    expect(
      submittedPanelView(
        { status: 'in_progress', totalScore: null, feedback: null },
        10,
      ),
    ).toEqual({ heading: 'Exam submitted', scoreText: null, feedback: null })
  })

  it('shows the score once graded', () => {
    expect(
      submittedPanelView(
        { status: 'graded', totalScore: 7, feedback: null },
        10,
      ),
    ).toEqual({ heading: 'Exam graded', scoreText: '7 / 10', feedback: null })
  })

  it('keeps the score hidden when graded without a total', () => {
    expect(
      submittedPanelView(
        { status: 'graded', totalScore: null, feedback: null },
        10,
      ),
    ).toEqual({ heading: 'Exam graded', scoreText: null, feedback: null })
  })

  it('shows grader feedback once graded', () => {
    expect(
      submittedPanelView(
        { status: 'graded', totalScore: 7, feedback: 'Well done' },
        10,
      ),
    ).toEqual({
      heading: 'Exam graded',
      scoreText: '7 / 10',
      feedback: 'Well done',
    })
  })

  it('hides feedback until the attempt is graded', () => {
    expect(
      submittedPanelView(
        { status: 'submitted', totalScore: null, feedback: 'Draft feedback' },
        10,
      ).feedback,
    ).toBeNull()
  })
})
