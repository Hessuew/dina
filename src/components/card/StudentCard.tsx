import { ArrowRight } from 'lucide-react'
import type { StudentWithStats } from '@/types/student'
import { Button } from '@/components/ui/button'

type StudentCardProps = {
  student: StudentWithStats
  onClick: () => void
}

function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) return names[0].substring(0, 2).toUpperCase()
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

export function StudentCard({ student, onClick }: StudentCardProps) {
  const initials = getInitials(student.fullName)

  return (
    <div className="border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)]">
      {/* Avatar area */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="flex min-h-40 items-center justify-center bg-[#1A1716]">
          {student.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={student.fullName}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-2xl text-[#E9D9B4]">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
        </div>
      </div>

      {/* Detail area */}
      <div className="bg-[#151515]/88 px-5 py-5">
        <div className="h-px w-8 bg-[#C5A059]/40" />
        <div className="mt-2 text-[0.62rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
          Student
        </div>
        <h3 className="mt-1 font-serif text-lg leading-snug text-[#F8F4EC]">
          {student.fullName}
        </h3>
        <p className="mt-0.5 truncate text-[0.72rem] text-[#8E816D]">
          {student.email}
        </p>

        <div className="mt-3 flex items-center justify-between text-[0.68rem] text-[#8E816D]">
          <span>Submitted</span>
          <span className="text-[#CFC6B7]">
            {student.assignmentStats.submittedAssignments} /{' '}
            {student.assignmentStats.totalAssignments}
          </span>
        </div>

        {student.assignmentStats.averageGradeByCourse.length > 0 && (
          <div className="mt-2 space-y-1">
            {student.assignmentStats.averageGradeByCourse.map((course) => (
              <div
                key={course.courseId}
                className="flex items-center justify-between text-[0.68rem]"
              >
                <span className="max-w-[60%] truncate text-[#8E816D]">
                  {course.courseTitle}
                </span>
                <span className="font-medium text-[#CFC6B7]">
                  {course.averageGrade}/{course.maxGrade}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
          <span className="text-[0.68rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
            View student
          </span>
          <Button theme="dark" size="icon" onClick={onClick}>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
