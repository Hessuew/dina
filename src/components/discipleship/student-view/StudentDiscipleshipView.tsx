import { StudentRosterSection } from './StudentRosterSection'
import { StudentScheduleSection } from './StudentScheduleSection'
import type { StudentDiscipleshipView as View } from '@/utils/discipleship/domain/discipleship-student-view.domain'

export function StudentDiscipleshipView({ view }: { view: View }) {
  if (view.kind === 'unassigned') {
    return (
      <div className="rounded-xl border border-black/10 bg-white/60 p-6">
        <p className="font-serif text-lg text-[#2B2417]">
          Not assigned to a teacher yet
        </p>
        <p className="mt-2 max-w-md text-sm text-[#6B5E4C]">
          Once staff places you under a discipler, your 1-on-1, pair, and group
          meeting times and classmates will show here.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <StudentScheduleSection view={view} />
      <StudentRosterSection roster={view.roster} />
    </div>
  )
}
