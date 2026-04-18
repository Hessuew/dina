import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowRight, CalendarIcon, ChevronLeft } from 'lucide-react'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { getStudentDetail } from '@/utils/students'

export const Route = createFileRoute('/_authed/students/$studentId')({
  loader: async ({ params }) => {
    const result = await getStudentDetail({
      data: { studentId: params.studentId },
    })
    return result
  },
  component: StudentDetailComponent,
})

function StudentDetailComponent() {
  const { student } = Route.useLoaderData()
  const router = useRouter()

  const handleAssignmentClick = (assignmentId: string) => {
    router.navigate({
      to: '/assignments/$assignmentId',
      params: { assignmentId },
      search: {
        calendarMonth: undefined,
        fromCalendar: false,
        fromDashboard: false,
      },
    })
  }

  const initials = student.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const assignmentsByCourse = student.enrollments.map((enrollment) => ({
    course: enrollment,
    assignments: student.assignments.filter(
      (a) => a.courseId === enrollment.courseId,
    ),
  }))

  return (
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
        {/* Page header */}
        <div className="mb-10">
          <Button
            variant="ghost"
            theme="light"
            size="sm"
            className="mb-6 gap-1"
            onClick={() => router.navigate({ to: '/students' })}
          >
            <ChevronLeft className="size-3.5" />
            All Students
          </Button>
          <div className="h-px w-10 bg-[#C5A059]/50" />
          <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815]">
            {student.fullName}
          </h1>
          <p className="mt-2 text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
            Student details &amp; grades
          </p>
        </div>

        {/* Info card */}
        <div className="mb-10 border border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.12)]">
          <div className="flex items-start gap-6 px-6 py-6">
            <div className="shrink-0">
              {student.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt={student.fullName}
                  className="size-20 border border-[#1A1A1A]/10 object-cover"
                />
              ) : (
                <div className="flex size-20 items-center justify-center border border-[#9B7A41]/30 bg-[#EDE8DE] font-serif text-2xl text-[#9B7A41]">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-px w-8 bg-[#C5A059]/50" />
              <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                Student
              </div>
              <h2 className="mt-1 font-serif text-2xl text-[#1C1815]">
                {student.fullName}
              </h2>
              <p className="mt-0.5 text-sm text-[#8E816D]">{student.email}</p>
              {student.bio && (
                <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[#5E5549]">
                  {student.bio}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 text-[0.68rem] text-[#8E816D]">
                <span>
                  {student.enrollments.length} enrolled{' '}
                  {student.enrollments.length === 1 ? 'course' : 'courses'}
                </span>
                <span className="h-3 w-px bg-[#1A1A1A]/12" />
                <span>
                  {student.assignments.length} submitted{' '}
                  {student.assignments.length === 1
                    ? 'assignment'
                    : 'assignments'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Assignments by course */}
        <div className="space-y-10">
          {assignmentsByCourse.map(({ course, assignments }) => {
            if (assignments.length === 0) return null

            const courseGrades = assignments
              .filter((a) => a.submission?.grade !== null)
              .map((a) => ({
                grade: a.submission!.grade!,
                maxGrade: a.maxGrade ?? 100,
              }))

            const averageGrade =
              courseGrades.length > 0
                ? Math.round(
                    courseGrades.reduce(
                      (sum, g) => sum + (g.grade / g.maxGrade) * 100,
                      0,
                    ) / courseGrades.length,
                  )
                : null

            return (
              <div key={course.courseId} className="space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                  <div className="flex items-baseline gap-4">
                    <h3 className="font-serif text-xl text-[#1C1815]">
                      {course.courseTitle}
                    </h3>
                    <span className="text-[0.68rem] tracking-[0.18em] text-[#8E816D] uppercase">
                      {assignments.length}{' '}
                      {assignments.length === 1 ? 'assignment' : 'assignments'}
                    </span>
                  </div>
                  {averageGrade !== null && (
                    <span className="border border-[#C5A059]/40 px-3 py-1 text-[0.62rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase">
                      Avg {averageGrade}%
                    </span>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {assignments.map((assignment) => {
                    const isGraded = assignment.submission?.grade !== null

                    return (
                      <div
                        key={assignment.id}
                        className="group border border-[#1A1A1A]/10 bg-[#F8F4EC] shadow-[0_16px_28px_-24px_rgba(0,0,0,0.12)] transition-all hover:border-[#C5A059]/30"
                      >
                        <div className="px-5 pt-5 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="mt-1 h-px w-6 shrink-0 bg-[#C5A059]/40" />
                            <span
                              className={`shrink-0 border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.18em] uppercase ${
                                isGraded
                                  ? 'border-[#C5A059]/40 text-[#9B7A41]'
                                  : 'border-[#1A1A1A]/12 text-[#8E816D]'
                              }`}
                            >
                              {isGraded ? 'Graded' : 'Submitted'}
                            </span>
                          </div>
                          <h4 className="mt-2 font-serif text-base leading-snug text-[#1C1815]">
                            {assignment.title}
                          </h4>
                          <p className="mt-1 text-[0.72rem] text-[#8E816D]">
                            {assignment.lessonTitle}
                          </p>
                        </div>

                        <div className="border-t border-[#1A1A1A]/8 px-5 py-3">
                          <div className="flex items-center gap-1.5 text-[0.68rem] text-[#9B8C7C]">
                            <CalendarIcon className="size-3" />
                            <span>
                              Due{' '}
                              {new Date(
                                assignment.dueDate,
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          {isGraded && (
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-[0.68rem] tracking-widest text-[#8E816D] uppercase">
                                Grade
                              </span>
                              <span className="font-serif text-sm text-[#1C1815]">
                                {assignment.submission?.grade} /{' '}
                                {assignment.maxGrade ?? 100}
                              </span>
                            </div>
                          )}

                          {/* Footer action */}
                          <div className="mt-3 flex items-center justify-between border-t border-[#1A1A1A]/8 pt-3">
                            <span className="text-[0.68rem] font-medium tracking-[0.2em] text-[#5E5549] uppercase">
                              View assignment
                            </span>
                            <Button
                              theme="light"
                              size="icon"
                              onClick={() =>
                                handleAssignmentClick(assignment.id)
                              }
                            >
                              <ArrowRight className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {student.assignments.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-serif text-lg text-[#8E816D]">
                No submitted assignments
              </p>
              <p className="mt-1 text-sm text-[#9B8C7C]">
                This student hasn't submitted any assignments yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
