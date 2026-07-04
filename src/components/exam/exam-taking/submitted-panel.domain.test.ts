import { describe, expect, it } from 'vitest'
import { submittedPanelView } from './submitted-panel.domain'

describe('submittedPanelView', () => {
  it('hides the score until the attempt is graded', () => {
    expect(
      submittedPanelView({ status: 'submitted', totalScore: null }, 10),
    ).toEqual({ heading: 'Exam submitted', scoreText: null })
    expect(
      submittedPanelView({ status: 'in_progress', totalScore: null }, 10),
    ).toEqual({ heading: 'Exam submitted', scoreText: null })
  })

  it('shows the score once graded', () => {
    expect(
      submittedPanelView({ status: 'graded', totalScore: 7 }, 10),
    ).toEqual({ heading: 'Exam graded', scoreText: '7 / 10' })
  })

  it('keeps the score hidden when graded without a total', () => {
    expect(
      submittedPanelView({ status: 'graded', totalScore: null }, 10),
    ).toEqual({ heading: 'Exam graded', scoreText: null })
  })
})
