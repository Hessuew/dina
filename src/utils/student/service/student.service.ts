import {
  findAllAssignments,
  findAllCourses,
  findAllCoursesDesc,
  findAllStudents,
  findAssignmentsWithDetails,
  findStudentById,
  findSubmissionsForStudents,
  findSubmittedSubmissionsForStudent,
} from '../repository'
import {
  buildAssignmentsWithSubmissions,
  buildStudentWithStats,
} from '../domain/student.domain'
import type {
  StudentDetailWithAssignments,
  StudentWithStats,
} from '@/types/student'
import type { GetStudentDetailInput } from '@/schemas/student.schema'
import { NotFoundError } from '@/utils/errors'
import { buildCourseAttendanceScores } from '@/utils/attendance/domain/attendance-score.domain'
import {
  findAllLessonsForAttendance,
  findPresentsForStudent,
  findPresentsForStudents,
} from '@/utils/attendance/repository/attendance.repository'

export async function getStudentsService() {
  const [allStudents, courses, allAssignments, allLessons] = await Promise.all([
    findAllStudents(),
    findAllCourses(),
    findAllAssignments(),
    findAllLessonsForAttendance(),
  ])

  const studentIds = allStudents.map((s) => s.id)
  const [allSubmissions, allPresents] = await Promise.all([
    findSubmissionsForStudents(studentIds),
    findPresentsForStudents(studentIds),
  ])

  const submissionsByStudent = new Map<string, typeof allSubmissions>()
  for (const s of allSubmissions) {
    const arr = submissionsByStudent.get(s.studentId) ?? []
    arr.push(s)
    submissionsByStudent.set(s.studentId, arr)
  }

  const studentsWithStats: Array<StudentWithStats> = allStudents.map(
    (student) =>
      buildStudentWithStats(
        student,
        courses,
        submissionsByStudent.get(student.id) ?? [],
        allAssignments.length,
        buildCourseAttendanceScores(
          courses,
          allLessons,
          allPresents,
          student.id,
        ),
      ),
  )

  return { students: studentsWithStats }
}

export async function getStudentDetailService(data: GetStudentDetailInput) {
  const student = await findStudentById(data.studentId)

  if (!student) {
    throw new NotFoundError('Student not found', {
      details: { studentId: data.studentId },
    })
  }

  const [enrollments, allAssignments, allLessons, presents] = await Promise.all(
    [
      findAllCoursesDesc(),
      findAssignmentsWithDetails(),
      findAllLessonsForAttendance(),
      findPresentsForStudent(student.id),
    ],
  )

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
    attendanceByCourse: buildCourseAttendanceScores(
      enrollments.map((e) => ({ id: e.id, title: e.title })),
      allLessons,
      presents,
      student.id,
    ),
  }

  return { student: studentDetail }
}
