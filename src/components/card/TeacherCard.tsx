import { ArrowRight, BookOpenIcon } from 'lucide-react'
import type { TeacherWithCourses } from '@/types/teacher'
import { Button } from '@/components/ui/button'

function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase()
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

type TeacherCardProps = {
  teacher: TeacherWithCourses
  onClick: () => void
}

export function TeacherCard({ teacher, onClick }: TeacherCardProps) {
  const initials = getInitials(teacher.fullName)

  return (
    <div className="group border border-white/10 bg-[#171717]/72 shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] transition-all hover:border-[#C5A059]/30">
      {/* Image / avatar area — mirrors CourseCard image area */}
      <div className="relative overflow-hidden border-b border-white/10">
        {teacher.avatarUrl ? (
          <div
            className="relative min-h-48 bg-cover bg-center sm:min-h-56"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(7,7,8,0.18), rgba(7,7,8,0.68)), url(${teacher.avatarUrl})`,
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_38%,rgba(197,160,89,0.10)_100%)]" />
            <div className="relative flex min-h-48 flex-col justify-between p-5 sm:min-h-56 sm:p-6">
              {/* Top: index badge */}
              <div className="flex items-start justify-between">
                <div className="border border-[#C5A059]/40 bg-black/20 px-3 py-1.5 text-[0.62rem] font-medium tracking-[0.22em] text-[#D4B373] uppercase backdrop-blur-sm">
                  The Ground
                </div>
              </div>
              {/* Bottom: courses chip */}
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[0.62rem] font-medium tracking-[0.22em] text-[#AFA28F] uppercase">
                  <BookOpenIcon className="size-3" />
                  {teacher.courseCount} courses
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-48 items-center justify-center bg-[#1A1716] sm:min-h-56">
            <div className="flex size-20 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-2xl text-[#E9D9B4]">
              {initials}
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />
          </div>
        )}
      </div>

      {/* Detail area */}
      <div className="bg-[#151515]/88 px-5 py-5 sm:px-6 sm:py-6">
        <h3 className="font-serif text-lg leading-tight text-[#F8F4EC] sm:text-xl">
          {teacher.fullName}
        </h3>
        {teacher.bio && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 whitespace-pre-wrap text-[#CFC6B7]">
            {teacher.bio}
          </p>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
          <span className="text-[0.68rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
            View profile
          </span>
          <Button theme="dark" size="icon" onClick={onClick}>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
