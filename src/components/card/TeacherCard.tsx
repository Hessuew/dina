import type { TeacherWithCourse } from '@/types/teacher'

function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ')
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase()
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}

type TeacherCardProps = {
  teacher: TeacherWithCourse
  onClick: () => void
}

export function TeacherCard({ teacher, onClick }: TeacherCardProps) {
  const initials = getInitials(teacher.fullName)
  const topLabel = teacher.course?.title ?? teacher.lecturerTitle ?? undefined

  return (
    <div
      className="group relative aspect-3/4 cursor-pointer overflow-hidden border border-[#C5A059]/40 bg-[#0F0C07] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] transition-all duration-300 hover:border-[#C5A059]/70"
      onClick={onClick}
    >
      {/* Inner decorative gold border */}
      <div className="pointer-events-none absolute inset-[7px] z-10 border border-[#C5A059]/25 transition-colors duration-300 group-hover:border-[#C5A059]/45" />

      {/* Full-bleed image or initials fallback */}
      {teacher.avatarUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url(${teacher.avatarUrl})` }}
          role="img"
          aria-label={teacher.fullName}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A1716]">
          <div className="flex size-20 items-center justify-center border border-[#C5A059]/30 bg-[#1C1A17] font-serif text-2xl text-[#E9D9B4]">
            {initials}
          </div>
        </div>
      )}

      {/* Gradient: darkens top and bottom, transparent in middle */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,2,0.72)_0%,transparent_32%,transparent_58%,rgba(5,4,2,0.88)_100%)]" />

      {/* Top: course title or lecturer title */}
      {topLabel && (
        <div className="absolute inset-x-0 top-5 z-20 flex flex-col items-center gap-2 px-4">
          <span className="text-center text-[0.6rem] font-medium tracking-[0.32em] text-[#D4B373] uppercase">
            {topLabel}
          </span>
          <div className="h-px w-7 bg-[#C5A05988]" />
        </div>
      )}

      {/* Bottom: teacher name */}
      <div className="absolute inset-x-0 bottom-5 z-20 flex flex-col items-center gap-2 px-4">
        <div className="h-px w-7 bg-[#C5A05988]" />
        <h3 className="text-center font-serif text-base leading-tight text-[#F8F4EC] italic sm:text-lg">
          {teacher.fullName}
        </h3>
      </div>
    </div>
  )
}
