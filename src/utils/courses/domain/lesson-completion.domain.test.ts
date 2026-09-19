import { describe, expect, it } from 'vitest'
import { buildCompletedLessonIds } from './lesson-completion.domain'

describe('buildCompletedLessonIds', () => {
  it('returns only lessons whose published assignments are all graded', () => {
    const result = buildCompletedLessonIds(
      ['lesson-1', 'lesson-2'],
      [
        { id: 'assignment-1', lessonId: 'lesson-1' },
        { id: 'assignment-2', lessonId: 'lesson-1' },
        { id: 'assignment-3', lessonId: 'lesson-2' },
      ],
      [
        { assignmentId: 'assignment-1', grade: 90 },
        { assignmentId: 'assignment-2', grade: 0 },
        { assignmentId: 'assignment-3', grade: null },
      ],
    )

    expect(result).toEqual(['lesson-1'])
  })

  it('does not complete lessons without published assignments', () => {
    expect(
      buildCompletedLessonIds(
        ['lesson-1'],
        [],
        [{ assignmentId: 'assignment-1', grade: 100 }],
      ),
    ).toEqual([])
  })

  it('ignores submissions for assignments outside the requested lessons', () => {
    expect(
      buildCompletedLessonIds(
        ['lesson-1'],
        [{ id: 'assignment-1', lessonId: 'lesson-1' }],
        [
          { assignmentId: 'assignment-1', grade: 80 },
          { assignmentId: 'assignment-other', grade: 100 },
        ],
      ),
    ).toEqual(['lesson-1'])
  })
})
