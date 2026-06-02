import { NotFoundError, ValidationError } from '@/utils/errors'

type ProfileLike = { id: string; role: string; fullName?: string | null }

export function validateSameTeacher(
  teacher1Id: string,
  teacher2Id: string,
): void {
  if (teacher1Id === teacher2Id) {
    throw new ValidationError('Must assign 2 different teachers to a course', {
      code: 'TEACHER_PAIR_INVALID',
      details: { teacher1Id, teacher2Id },
    })
  }
}

export function validateTeacherRoles(
  teachers: Array<ProfileLike>,
  teacher1Id: string,
  teacher2Id: string,
  allowAdmin = false,
): void {
  if (teachers.length !== 2) {
    throw new NotFoundError('One or both teachers not found', {
      details: { teacher1Id, teacher2Id },
    })
  }

  const teacher1 = teachers.find((t) => t.id === teacher1Id)
  const teacher2 = teachers.find((t) => t.id === teacher2Id)
  const validRoles = allowAdmin ? ['teacher', 'admin'] : ['teacher']

  if (!teacher1 || !validRoles.includes(teacher1.role)) {
    throw new ValidationError(
      `${teacher1?.fullName || 'Teacher 1'} is not a teacher`,
      { details: { teacherId: teacher1Id, role: teacher1?.role } },
    )
  }
  if (!teacher2 || !validRoles.includes(teacher2.role)) {
    throw new ValidationError(
      `${teacher2?.fullName || 'Teacher 2'} is not a teacher`,
      { details: { teacherId: teacher2Id, role: teacher2?.role } },
    )
  }
}
