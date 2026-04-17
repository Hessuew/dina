import { ArrowRight, BookOpenIcon } from 'lucide-react'
import type { TeacherWithCourses } from '@/types/teacher'
import { Button } from '@/components/ui/button'

type TeacherCardProps = {
  teacher: TeacherWithCourses
  onClick: () => void
}

function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase()
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

export function TeacherCard({ teacher, onClick }: TeacherCardProps) {
  const initials = getInitials(teacher.fullName)

  return (
    <div className="group border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] transition-all hover:border-[#C5A059]/30">
      {/* Avatar area */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="flex min-h-48 items-center justify-center bg-[#1A1716]">
          {/* <div
            className="absolute inset-0 bg-cover bg-center sm:min-h-56"
            style={{
              background: `linear-gradient(180deg, rgba(7,7,8,0.18), rgba(7,7,8,0.68))`,
            }}
          ></div> */}
          {teacher.avatarUrl ? (
            <img
              src={teacher.avatarUrl}
              alt={teacher.fullName}
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
          Teacher
        </div>
        <h3 className="mt-1 font-serif text-lg leading-snug text-[#F8F4EC]">
          {teacher.fullName}
        </h3>

        <div className="mt-3 flex items-center gap-1.5 text-[0.68rem] text-[#8E816D]">
          <BookOpenIcon className="size-3" />
          <span>
            {teacher.courseCount}{' '}
            {teacher.courseCount === 1 ? 'course' : 'courses'}
          </span>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
          <span className="text-[0.68rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
            View profile
          </span>

          <Button
            className="flex size-8 cursor-pointer items-center justify-center border border-[#C5A059]/35 bg-[#1A1716] text-[#E9D9B4]"
            onClick={onClick}
          >
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
