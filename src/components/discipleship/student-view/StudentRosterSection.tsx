import { Users } from 'lucide-react'
import { StudentPersonRow } from './StudentPersonRow'
import type { StudentDiscipleshipViewAssigned } from '@/utils/discipleship/domain/discipleship-student-view.domain'

type Props = {
  roster: StudentDiscipleshipViewAssigned['roster']
}

export function StudentRosterSection({ roster }: Props) {
  const empty = roster.pairs.length === 0 && roster.solos.length === 0
  return (
    <div className="rounded-xl border border-black/10 bg-white/60 p-4">
      <p className="font-serif text-sm font-semibold text-[#2B2417]">
        Classmates under your teacher
      </p>
      <p className="mt-0.5 text-[0.72rem] text-[#6B5E4C]">
        Names only — their meeting times stay private.
      </p>
      {empty ? (
        <p className="mt-3 text-sm text-[#8E816D]">No other students yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {roster.pairs.map((pair) => (
            <div
              key={pair.pairId}
              className="rounded-lg border border-[#C5A059]/30 bg-[#C5A059]/5 p-2"
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase">
                <Users className="size-3" />
                Pair
              </div>
              <div className="flex flex-col gap-2">
                {pair.members.map((member) => (
                  <StudentPersonRow key={member.id} person={member} />
                ))}
              </div>
            </div>
          ))}
          {roster.solos.length > 0 && (
            <div className="flex flex-col gap-2">
              {roster.solos.map((solo) => (
                <StudentPersonRow key={solo.id} person={solo} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
