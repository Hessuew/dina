import { describe, expect, it } from 'vitest'
import { STANDARD_EXAM_INSTRUCTIONS } from './exam-instructions.domain'

describe('STANDARD_EXAM_INSTRUCTIONS', () => {
  it('contains all essential exam guidelines with unique keys', () => {
    expect(STANDARD_EXAM_INSTRUCTIONS.length).toBeGreaterThanOrEqual(4)
    const ids = STANDARD_EXAM_INSTRUCTIONS.map((item) => item.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)

    for (const item of STANDARD_EXAM_INSTRUCTIONS) {
      expect(item.title.trim()).not.toBe('')
      expect(item.description.trim()).not.toBe('')
    }
  })

  it('highlights timed sitting and continuous timer', () => {
    const titles = STANDARD_EXAM_INSTRUCTIONS.map((item) => item.title)
    expect(titles.some((t) => t.includes('Timed sitting'))).toBe(true)
    expect(titles.some((t) => t.toLowerCase().includes('continuous'))).toBe(
      true,
    )
  })
})
