import type { Assignment } from '@/components/view/AssignmentsView'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { UpcomingAssignmentsList } from '@/components/list/UpcomingAssignmentsList'
import { UpcomingLessonsList } from '@/components/list/UpcomingLessonsList'

type UpcomingLesson = {
  id: string
  title: string
  scheduledTime: Date
  thumbnailUrl: string | null
  courseId: string
  courseName: string
}

type DashboardPanelProps = {
  lessons: Array<UpcomingLesson>
  assignments: Array<Assignment>
  role: 'student' | 'teacher' | 'admin'
  courseCount: number
  completedLessons?: number
  totalLessons?: number
}

export function DashboardPanel({
  lessons,
  assignments,
  role,
  courseCount,
  completedLessons,
  totalLessons,
}: DashboardPanelProps) {
  const isStudent = role === 'student'

  const overdueCount = assignments.filter(
    (a) =>
      a.status === 'published' &&
      new Date(a.dueDate) < new Date() &&
      (!a.submission || a.submission.grade === null),
  ).length

  const openAssignmentCount = assignments.filter(
    (a) =>
      a.status === 'published' &&
      new Date(a.dueDate) >= new Date() &&
      (!a.submission || a.submission.grade === null),
  ).length

  const gradedCount = assignments.filter(
    (a) => a.submission != null && a.submission.grade !== null,
  ).length

  const submittedPendingCount = assignments.filter(
    (a) =>
      a.submission != null &&
      a.submission.status === 'submitted' &&
      a.submission.grade === null,
  ).length

  const totalSubmissions = assignments.filter(
    (a) => a.submission != null,
  ).length

  const nextLesson = lessons.length > 0 ? lessons[0] : null

  return (
    <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
      {/* Header — bg image panel */}
      <div
        className="relative overflow-hidden border-b border-white/10"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.26), rgba(7,7,8,0.72)), url(${facultyBackground})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%,rgba(197,160,89,0.10)_100%)]" />
        <div className="relative flex min-h-44 flex-col justify-between p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[0.62rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                {isStudent ? 'My Learning' : 'Overview'}
              </div>
              <div className="mt-2 font-serif text-2xl leading-tight tracking-[-0.03em] text-white">
                {isStudent ? 'Progress' : 'Dashboard'}
              </div>
            </div>
            <div className="border border-white/12 bg-black/24 px-3 py-2 text-center">
              <div className="font-serif text-xl text-[#E9D9B4]">
                {courseCount}
              </div>
              <div className="mt-0.5 text-[0.55rem] font-medium tracking-[0.22em] text-[#AFA28F] uppercase">
                {courseCount === 1 ? 'Course' : 'Courses'}
              </div>
            </div>
          </div>

          <div className="flex items-end gap-3">
            {isStudent && totalLessons !== undefined && totalLessons > 0 && (
              <div className="border border-white/12 bg-black/24 px-4 py-3 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                <div className="text-[0.58rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                  Lessons Completed
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-serif text-xl text-[#F8F4EC]">
                    {completedLessons ?? 0}
                  </span>
                  <span className="text-xs text-[#8E816D]">
                    / {totalLessons}
                  </span>
                </div>
              </div>
            )}
            {!isStudent && (
              <div className="border border-white/12 bg-black/24 px-4 py-3 shadow-[0_24px_40px_-30px_rgba(0,0,0,0.55)] backdrop-blur-sm">
                <div className="text-[0.58rem] font-medium tracking-[0.28em] text-[#AFA28F] uppercase">
                  Upcoming Lessons
                </div>
                <div className="mt-1.5 font-serif text-xl text-[#F8F4EC]">
                  {lessons.length}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 border-b border-white/8">
        {isStudent ? (
          <>
            <div className="border-r border-white/8 px-4 py-4 text-center">
              <div className="font-serif text-lg text-[#E9D9B4]">
                {openAssignmentCount}
              </div>
              <div className="mt-1 text-[0.55rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                Open
              </div>
            </div>
            <div className="border-r border-white/8 px-4 py-4 text-center">
              <div
                className={`font-serif text-lg ${overdueCount > 0 ? 'text-[#C5A059]' : 'text-[#E9D9B4]'}`}
              >
                {overdueCount}
              </div>
              <div className="mt-1 text-[0.55rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                Overdue
              </div>
            </div>
            <div className="px-4 py-4 text-center">
              <div className="font-serif text-lg text-[#E9D9B4]">
                {gradedCount}
              </div>
              <div className="mt-1 text-[0.55rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                Graded
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="border-r border-white/8 px-4 py-4 text-center">
              <div className="font-serif text-lg text-[#E9D9B4]">
                {assignments.filter((a) => a.status === 'published').length}
              </div>
              <div className="mt-1 text-[0.55rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                Published
              </div>
            </div>
            <div className="border-r border-white/8 px-4 py-4 text-center">
              <div className="font-serif text-lg text-[#E9D9B4]">
                {totalSubmissions}
              </div>
              <div className="mt-1 text-[0.55rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                Submitted
              </div>
            </div>
            <div className="px-4 py-4 text-center">
              <div
                className={`font-serif text-lg ${submittedPendingCount > 0 ? 'text-[#C5A059]' : 'text-[#E9D9B4]'}`}
              >
                {submittedPendingCount}
              </div>
              <div className="mt-1 text-[0.55rem] font-medium tracking-[0.18em] text-[#8E816D] uppercase">
                To Grade
              </div>
            </div>
          </>
        )}
      </div>

      {/* Next lesson callout */}
      {nextLesson !== null && (
        <div className="border-b border-white/8 px-5 py-4">
          <div className="text-[0.58rem] font-medium tracking-[0.28em] text-[#8E816D] uppercase">
            Next lesson
          </div>
          <div className="mt-1.5 truncate font-serif text-sm text-[#F8F4EC]">
            {nextLesson.title}
          </div>
          <div className="mt-1 text-[0.65rem] tracking-[0.06em] text-[#D4B373]">
            {nextLesson.courseName} &middot;{' '}
            {new Date(nextLesson.scheduledTime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            {new Date(nextLesson.scheduledTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </div>
        </div>
      )}

      {/* Lists */}
      <div className="divide-y divide-white/8">
        <UpcomingLessonsList lessons={lessons} />
        <UpcomingAssignmentsList assignments={assignments} role={role} />
      </div>
    </div>
  )
}
