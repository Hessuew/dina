import { Link } from '@tanstack/react-router'
import { CalendarIcon, ClockIcon } from 'lucide-react'

type UpcomingLesson = {
  id: string
  title: string
  scheduledTime: Date
  thumbnailUrl: string | null
  courseId: string
  courseName: string
}

type UpcomingLessonsListProps = {
  lessons: Array<UpcomingLesson>
}

export function UpcomingLessonsList({ lessons }: UpcomingLessonsListProps) {
  const formatDateTime = (date: Date) => {
    const dateObj = new Date(date)
    return {
      date: dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      time: dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    }
  }

  return (
    <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      <div className="px-5 py-4">
        <div className="h-px w-8 bg-[#C5A059]/40" />
        <h3 className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
          Upcoming Lessons
        </h3>
      </div>

      <div className="px-5 pb-5">
        {lessons.length === 0 ? (
          <div className="py-6 text-center text-sm text-[#AFA28F]">
            No upcoming lessons scheduled
          </div>
        ) : (
          <div className="space-y-6">
            {lessons.map((lesson, idx) => {
              const { date, time } = formatDateTime(lesson.scheduledTime)
              return (
                <Link
                  key={lesson.id}
                  to="/lessons/$lessonId"
                  params={{ lessonId: lesson.id }}
                  className="block"
                >
                  <div className="group flex items-start gap-4 border-b border-white/8 py-5 transition-all first:pt-0 last:border-b-0 last:pb-0 hover:bg-white/8">
                    <div className="flex size-8 shrink-0 items-center justify-center border border-[#C5A059]/50 bg-[#1A1716] font-serif text-xs text-[#E9D9B4]">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[0.62rem] font-medium tracking-[0.26em] text-[#D4B373] uppercase">
                        {lesson.courseName}
                      </div>
                      <div className="mt-1 truncate font-serif text-base text-[#F8F4EC] group-hover:text-white">
                        {lesson.title}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-[#8E816D]">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="size-3" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="size-3" />
                          <span>{time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
