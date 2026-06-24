import { createFileRoute, useRouter } from '@tanstack/react-router'
import { CalendarIcon } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { getStudentDetail } from '@/utils/student'
import {
  computeCourseAverageGrade,
  formatAssignmentDueDate,
  formatAssignmentGrade,
  getAssignmentRowStatus,
  getStudentInitials,
  groupAssignmentsByCourse,
  shouldShowOverdueBadge,
} from '@/utils/student/domain/student-detail-view.domain'
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

  const initials = getStudentInitials(student.fullName)

  const assignmentsByCourse = groupAssignmentsByCourse(
    student.enrollments,
    student.assignments,
  )

  return (
    <PageLayout>
      <PageHeader
        title={student.fullName}
        onBack={() => router.navigate({ to: '/students' })}
        responsiveTitle={false}
        metadata={
          <p className="text-[0.72rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
            Student details &amp; grades
          </p>
        }
      />

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
            <p className="mt-0.5 truncate text-sm text-[#AFA28F]">
              {student.email}
            </p>
            {student.bio && (
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-[#CFC6B7]">
                {student.bio}
              </p>
            )}
            <div className="mt-4 text-[0.68rem] text-[#8E816D]">
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

          const averageGrade = computeCourseAverageGrade(assignments)

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
                    const status = getAssignmentRowStatus(assignment, now)

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
                                {formatAssignmentGrade(assignment, status)}
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
                                status.overdue
                                  ? 'text-destructive font-medium'
                                  : 'text-[#8E816D]',
                              )}
                            >
                              <CalendarIcon className="size-3" />
                              Due {formatAssignmentDueDate(assignment.dueDate)}
                            </div>
                            {shouldShowOverdueBadge(status) && (
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
    </PageLayout>
  )
}
