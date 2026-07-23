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
import {
  buildCourseAttendanceScores,
  withAttendanceManageFlags,
} from '@/utils/attendance/domain/attendance-score.domain'
import {
  findAllLessonsForAttendance,
  findPresentsForStudent,
  findPresentsForStudents,
} from '@/utils/attendance/repository/attendance.repository'
import { getUserProfile } from '@/utils/auth/auth'
import { findCourseAssignmentsForTeachers } from '@/utils/teachers/repository/course-teachers.repository'
import {
  signAvatarRows,
  signPrivateStoragePath,
} from '@/utils/storage/service/private-storage.service'

export async function getStudentsService() {
  const [allStudents, courses, allAssignments, allLessons] = await Promise.all([
    findAllStudents(),
    findAllCourses(),
    findAllAssignments(),
    findAllLessonsForAttendance(),
  ])

  const signedStudents = await signAvatarRows(allStudents)
  const studentIds = signedStudents.map((s) => s.id)
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

  const studentsWithStats: Array<StudentWithStats> = signedStudents.map(
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

async function resolveManageableCourseIds(
  actorId: string,
  courseIds: Array<string>,
): Promise<Set<string>> {
  if (courseIds.length === 0) return new Set()
  const profile = await getUserProfile(actorId)
  if (profile.role === 'admin') return new Set(courseIds)
  if (profile.role !== 'teacher') return new Set()
  const assignments = await findCourseAssignmentsForTeachers([actorId])
  const managed = new Set(assignments.map((a) => a.courseId))
  return new Set(courseIds.filter((id) => managed.has(id)))
}

export async function getStudentDetailService(
  data: GetStudentDetailInput,
  actorId: string,
) {
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

  const courseRefs = enrollments.map((e) => ({ id: e.id, title: e.title }))
  const scores = buildCourseAttendanceScores(
    courseRefs,
    allLessons,
    presents,
    student.id,
  )
  const manageable = await resolveManageableCourseIds(
    actorId,
    courseRefs.map((c) => c.id),
  )

  const studentDetail: StudentDetailWithAssignments = {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    bio: student.bio,
    avatarUrl: await signPrivateStoragePath('avatars', student.avatarUrl),
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
    attendanceByCourse: withAttendanceManageFlags(scores, manageable),
  }

  return { student: studentDetail }
}
