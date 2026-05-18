import { createServerFn } from '@tanstack/react-start'
import {
  findAllAssignments,
  findAllCourses,
  findAllCoursesDesc,
  findAllStudents,
  findAssignmentsWithDetails,
  findStudentById,
  findStudentSubmissions,
  findSubmittedSubmissionsForStudent,
} from './repository'
import {
  buildAssignmentsWithSubmissions,
  buildStudentWithStats,
} from './domain/student.domain'
import type {
  StudentDetailWithAssignments,
  StudentWithStats,
} from '@/types/student'
import { getStudentDetailSchema } from '@/schemas/student.schema'
import { NotFoundError } from '@/utils/errors'

export const getStudents = createServerFn({ method: 'POST' }).handler(
  async () => {
    const [allStudents, courses, allAssignments] = await Promise.all([
      findAllStudents(),
      findAllCourses(),
      findAllAssignments(),
    ])

    const studentsWithStats: Array<StudentWithStats> = await Promise.all(
      allStudents.map(async (student) => {
        const submissions = await findStudentSubmissions(student.id)
        return buildStudentWithStats(
          student,
          courses,
          submissions,
          allAssignments.length,
        )
      }),
    )

    return { students: studentsWithStats }
  },
)

export const getStudentDetail = createServerFn({ method: 'POST' })
  .inputValidator(getStudentDetailSchema)
  .handler(async ({ data }) => {
    const student = await findStudentById(data.studentId)

    if (!student) {
      throw new NotFoundError('Student not found', {
        details: { studentId: data.studentId },
      })
    }

    const [enrollments, allAssignments] = await Promise.all([
      findAllCoursesDesc(),
      findAssignmentsWithDetails(),
    ])

    const assignmentIds = allAssignments.map((a) => a.assignmentId)
    const studentSubmissions = await findSubmittedSubmissionsForStudent(
      student.id,
      assignmentIds,
    )

    const studentDetail: StudentDetailWithAssignments = {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      bio: student.bio,
      avatarUrl: student.avatarUrl,
      createdAt: student.createdAt,
      enrollments: enrollments.map((e) => ({
        id: e.id,
        status: 'active',
        courseId: e.id,
        courseTitle: e.title,
      })),
      assignments: buildAssignmentsWithSubmissions(
        allAssignments,
        studentSubmissions,
      ),
    }

    return { student: studentDetail }
  })
