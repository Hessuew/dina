import { createFileRoute, useRouter } from '@tanstack/react-router'
import { CalendarIcon, ChevronLeft } from 'lucide-react'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { getStudentDetail } from '@/utils/students'
import { cn } from '@/lib/utils'

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
            Back
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
        <div className="mb-10 border border-white/10 bg-[#1A1716] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
          <div className="flex items-start gap-6 px-6 py-6">
            <div className="shrink-0">
              {student.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt={student.fullName}
                  className="size-20 border border-white/10 object-cover"
                />
              ) : (
                <div className="flex size-20 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-2xl text-[#E9D9B4]">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-px w-8 bg-[#C5A059]/60" />
              <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                Student
              </div>
              <h2 className="mt-1 font-serif text-2xl text-[#F8F4EC]">
                {student.fullName}
              </h2>
              <p className="mt-0.5 text-sm text-[#AFA28F]">{student.email}</p>
              {student.bio && (
                <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[#CFC6B7]">
                  {student.bio}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 text-[0.68rem] text-[#8E816D]">
                <span>
                  {student.enrollments.length} enrolled{' '}
                  {student.enrollments.length === 1 ? 'course' : 'courses'}
                </span>
                <span className="h-3 w-px bg-white/12" />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

            const now = new Date()

            return (
              <div
                key={course.courseId}
                className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]"
              >
                {/* Panel header */}
                <div className="flex items-start justify-between px-6 py-4">
                  <div>
                    <div className="h-px w-8 bg-[#C5A059]/40" />
                    <h3 className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                      {course.courseTitle}
                    </h3>
                  </div>
                  {averageGrade !== null && (
                    <div className="border border-[#C5A059]/40 px-3 py-1 text-center">
                      <div className="font-serif text-base text-[#E9D9B4]">
                        {averageGrade}%
                      </div>
                      <div className="text-[0.55rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
                        avg
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignment rows */}
                <div className="px-5 pb-5">
                  <div className="space-y-6">
                    {assignments.map((assignment, idx) => {
                      const isGraded = assignment.submission?.grade !== null
                      const isSubmitted = assignment.submission !== null
                      const overdue = new Date(assignment.dueDate) < now

                      return (
                        <div
                          key={assignment.id}
                          className="group flex cursor-pointer items-start gap-4 border-b border-white/8 py-5 pl-1 transition-all first:pt-1 last:border-b-0 last:pb-0 hover:bg-white/8"
                          onClick={() => handleAssignmentClick(assignment.id)}
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center border border-[#C5A059]/50 bg-[#1A1716] font-serif text-xs text-[#E9D9B4]">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-[0.62rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
                                  {assignment.title}
                                </div>
                                <div className="mt-1 font-serif text-base text-[#F8F4EC] group-hover:text-white">
                                  {isGraded
                                    ? `${assignment.submission!.grade} / ${assignment.maxGrade ?? 100}`
                                    : isSubmitted
                                      ? 'Submitted'
                                      : 'Not submitted'}
                                </div>
                              </div>
                              {/* <div
                                className={`shrink-0 border px-2 py-1 text-[0.58rem] font-medium tracking-[0.18em] uppercase ${
                                  isGraded
                                    ? 'border-[#C5A059]/40 text-[#D4B373]'
                                    : isSubmitted
                                      ? 'border-white/20 text-[#AFA28F]'
                                      : 'border-white/12 text-[#8E816D]'
                                }`}
                              >
                                {isGraded
                                  ? 'Graded'
                                  : isSubmitted
                                    ? 'Submitted'
                                    : 'Pending'}
                              </div> */}
                            </div>
                            <div className="mt-1.5 flex items-center gap-1 text-xs">
                              <div
                                className={cn(
                                  'flex items-center gap-1',
                                  overdue
                                    ? 'text-destructive font-medium'
                                    : 'text-[#8E816D]',
                                )}
                              >
                                <CalendarIcon className="size-3" />
                                Due{' '}
                                {new Date(
                                  assignment.dueDate,
                                ).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                              {overdue && !isGraded && (
                                <span className="ml-1 text-[#C5A059]">
                                  (Overdue)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
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
