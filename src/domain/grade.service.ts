/**
 * Calculates average grade from array of grades with maxGrade values
 * Returns percentage (0-100)
 */
export function calculateAverageGrade(
  grades: Array<{ grade: number; maxGrade: number }>,
): number {
  if (grades.length === 0) return 0

  const sum = grades.reduce((acc, g) => acc + (g.grade / g.maxGrade) * 100, 0)
  return Math.round(sum / grades.length)
}
