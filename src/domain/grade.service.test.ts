import { describe, expect, it } from 'vitest'
import { calculateAverageGrade } from '@/domain/grade.service'

describe('calculateAverageGrade', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAverageGrade([])).toBe(0)
  })

  it('returns 100 for a perfect score', () => {
    expect(calculateAverageGrade([{ grade: 10, maxGrade: 10 }])).toBe(100)
  })

  it('averages multiple grades with the same maxGrade', () => {
    expect(
      calculateAverageGrade([
        { grade: 8, maxGrade: 10 }, // 80%
        { grade: 6, maxGrade: 10 }, // 60%
      ]),
    ).toBe(70)
  })

  it('handles different maxGrade values correctly', () => {
    expect(
      calculateAverageGrade([
        { grade: 50, maxGrade: 100 }, // 50%
        { grade: 10, maxGrade: 20 }, // 50%
      ]),
    ).toBe(50)
  })

  it('rounds to the nearest integer', () => {
    expect(calculateAverageGrade([{ grade: 1, maxGrade: 3 }])).toBe(33) // 33.3...%
  })
})
