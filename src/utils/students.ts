import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray } from 'drizzle-orm'
import type {
  StudentDetailWithAssignments,
  StudentWithStats,
} from '@/types/student'
import { getDb } from '@/db'
import {
  assignments,
  courses,
  lessons,
  profiles,
  submissions,
} from '@/db/schema'
import { getStudentDetailSchema } from '@/schemas/student.schema'

export const getStudents = createServerFn({ method: 'POST' }).handler(
  async () => {
    const db = await getDb()

    const students = await db.query.profiles.findMany({
      where: eq(profiles.role, 'student'),
      orderBy: (p, { asc }) => [asc(p.fullName)],
    })

    const studentsWithStats: Array<StudentWithStats> = await Promise.all(
      students.map(async (student) => {
        const studentCourses = await db.query.courses.findMany({
          columns: {
            id: true,
            title: true,
          },
        })

        const studentSubmissions = await db.query.submissions.findMany({
          where: and(eq(submissions.studentId, student.id)),
          with: {
            assignment: {
              with: {
                lesson: {
                  with: {
                    course: {
                      columns: {
                        id: true,
                        title: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })

        const allAssignmentsForStudent = await db
          .select({
            id: assignments.id,
            courseId: courses.id,
          })
          .from(assignments)
          .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
          .innerJoin(courses, eq(lessons.courseId, courses.id))

        const averageGradeByCourse = studentCourses.map((enrollment) => {
          const courseSubmissions = studentSubmissions.filter(
            (sub) => sub.assignment.lesson.course.id === enrollment.id,
          )

          const gradesInCourse = courseSubmissions
            .filter((sub) => sub.grade !== null)
            .map((sub) => ({
              grade: sub.grade!,
              maxGrade: sub.assignment.maxGrade ?? 100,
            }))

          if (gradesInCourse.length === 0) return null

          const averageGrade =
            gradesInCourse.reduce(
              (sum, g) => sum + (g.grade / g.maxGrade) * 100,
              0,
            ) / gradesInCourse.length

          return {
            courseId: enrollment.id,
            courseTitle: enrollment.title,
            averageGrade: Math.round(averageGrade),
            maxGrade: 100,
          }
        })

        return {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          avatarUrl: student.avatarUrl,
          createdAt: student.createdAt,
          enrollmentCount: studentCourses.length,
          assignmentStats: {
            totalAssignments: allAssignmentsForStudent.length,
            submittedAssignments: studentSubmissions.filter(
              (s) => s.status !== 'draft',
            ).length,
            averageGradeByCourse: averageGradeByCourse.filter(
              (g): g is NonNullable<typeof g> => g !== null,
            ),
          },
        }
      }),
    )

    return { students: studentsWithStats }
  },
)

export const getStudentDetail = createServerFn({ method: 'POST' })
  .inputValidator(getStudentDetailSchema)
  .handler(async ({ data }) => {
    const db = await getDb()

    const student = await db.query.profiles.findFirst({
      where: and(eq(profiles.id, data.studentId), eq(profiles.role, 'student')),
    })

    if (!student) {
      throw new Error('Student not found')
    }

    const studentEnrollments = await db.query.courses.findMany({
      columns: {
        id: true,
        title: true,
      },
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    })

    const allAssignmentsForStudent = await db
      .select({
        assignmentId: assignments.id,
        assignmentTitle: assignments.title,
        assignmentDueDate: assignments.dueDate,
        assignmentMaxGrade: assignments.maxGrade,
        courseId: courses.id,
        courseTitle: courses.title,
        lessonId: lessons.id,
        lessonTitle: lessons.title,
      })
      .from(assignments)
      .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .orderBy(assignments.dueDate)

    const assignmentIds = allAssignmentsForStudent.map((a) => a.assignmentId)

    const studentSubmissions =
      assignmentIds.length > 0
        ? await db.query.submissions.findMany({
            where: and(
              eq(submissions.studentId, student.id),
              inArray(submissions.assignmentId, assignmentIds),
              eq(submissions.status, 'submitted'),
            ),
          })
        : []

    const submissionsMap = new Map(
      studentSubmissions.map((sub) => [sub.assignmentId, sub]),
    )

    const assignmentsWithSubmissions = allAssignmentsForStudent
      .map((assignment) => {
        const submission = submissionsMap.get(assignment.assignmentId)
        if (!submission) return null

        return {
          id: assignment.assignmentId,
          title: assignment.assignmentTitle,
          dueDate: assignment.assignmentDueDate,
          maxGrade: assignment.assignmentMaxGrade,
          courseId: assignment.courseId,
          courseTitle: assignment.courseTitle,
          lessonId: assignment.lessonId,
          lessonTitle: assignment.lessonTitle,
          submission: {
            id: submission.id,
            status: submission.status,
            grade: submission.grade,
            submittedAt: submission.submittedAt,
            gradedAt: submission.gradedAt,
            feedback: submission.feedback,
          },
        }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)

    const studentDetail: StudentDetailWithAssignments = {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      bio: student.bio,
      avatarUrl: student.avatarUrl,
      createdAt: student.createdAt,
      enrollments: studentEnrollments.map((e) => ({
        id: e.id,
        status: 'active',
        courseId: e.id,
        courseTitle: e.title,
      })),
      assignments: assignmentsWithSubmissions,
    }

    return { student: studentDetail }
  })
