import { Users } from 'lucide-react'
import { StudentCard } from './StudentCard'
import { MeetingTimeRow } from './MeetingTimeRow'
import type { BoardPairView } from '@/utils/discipleship/domain/discipleship-board.domain'

type PairRowProps = {
  pairView: BoardPairView
  canManage: boolean
  onSetPairTime: (pairId: string) => void
  onSetIndividual: (studentId: string, anchorAt: string | null) => void
  onUnpair: (studentId: string) => void
}

export function PairRow({
  pairView,
  canManage,
  onSetPairTime,
  onSetIndividual,
  onUnpair,
}: PairRowProps) {
  const { pair, members } = pairView
  return (
    <div className="rounded-lg border border-[#C5A059]/30 bg-[#C5A059]/5 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase">
        <Users className="size-3" />
        Pair
      </div>
      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <StudentCard
            key={member.student.id}
            student={member.student}
            canManage={canManage}
            individualAnchor={member.assignment.anchorAt}
            onSetIndividual={() =>
              onSetIndividual(member.student.id, member.assignment.anchorAt)
            }
            onUnpair={() => onUnpair(member.student.id)}
          />
        ))}
      </div>
      <div className="mt-2">
        <MeetingTimeRow
          label="Pair"
          anchorAt={pair.anchorAt}
          canManage={canManage}
          onSetTime={() => onSetPairTime(pair.id)}
        />
      </div>
    </div>
  )
}
