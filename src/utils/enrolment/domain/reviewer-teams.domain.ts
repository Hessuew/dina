export type ReviewerTeamMember = { id: string; name: string }

type CourseTeacherRow = {
  courseId: string
  teacherId: string
}

type CourseSubstituteRow = {
  courseId: string
  substituteTeacherId: string
  absentTeacherId: string
}

type ProfileRow = {
  id: string
  fullName: string
}

export function buildReviewerTeams(
  courseTeachers: ReadonlyArray<CourseTeacherRow>,
  courseSubstitutes: ReadonlyArray<CourseSubstituteRow>,
  profiles: ReadonlyArray<ProfileRow>,
): Map<string, Array<ReviewerTeamMember>> {
  const namesByProfileId = new Map(
    profiles.map((profile) => [profile.id, profile.fullName]),
  )
  const absentByCourse = new Map<string, Set<string>>()

  for (const substitution of courseSubstitutes) {
    const absentTeacherIds =
      absentByCourse.get(substitution.courseId) ?? new Set<string>()
    absentTeacherIds.add(substitution.absentTeacherId)
    absentByCourse.set(substitution.courseId, absentTeacherIds)
  }

  const membersByCourse = new Map<string, Array<ReviewerTeamMember>>()
  const membershipRows = [
    ...courseTeachers.map((row) => ({
      courseId: row.courseId,
      memberId: row.teacherId,
    })),
    ...courseSubstitutes.map((row) => ({
      courseId: row.courseId,
      memberId: row.substituteTeacherId,
    })),
  ]

  for (const row of membershipRows) {
    if (absentByCourse.get(row.courseId)?.has(row.memberId)) continue
    const name = namesByProfileId.get(row.memberId)
    if (name === undefined) continue
    const members = membersByCourse.get(row.courseId) ?? []
    if (!members.some((member) => member.id === row.memberId)) {
      members.push({ id: row.memberId, name })
    }
    membersByCourse.set(row.courseId, members)
  }

  return membersByCourse
}
