import { StudentPersonRow } from './StudentPersonRow'
import type { StudentDiscipleshipViewAssigned } from '@/utils/discipleship/domain/discipleship-student-view.domain'
import { MeetingTimeRow } from '@/components/discipleship/MeetingTimeRow'

type Props = {
  view: StudentDiscipleshipViewAssigned
}

export function StudentScheduleSection({ view }: Props) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/60 p-4">
      <p className="font-serif text-sm font-semibold text-[#2B2417]">
        {view.teacher.fullName}
      </p>
      <p className="mt-0.5 text-[0.7rem] tracking-wide text-[#8E816D] uppercase">
        Your teacher
      </p>
      <div className="mt-3 flex flex-col gap-2 border-t border-black/8 pt-3">
        <MeetingTimeRow
          label="1-on-1"
          anchorAt={view.individualAnchor}
          canManage={false}
          onSetTime={() => {}}
        />
        <MeetingTimeRow
          label="Pair"
          anchorAt={view.pair?.anchorAt ?? null}
          canManage={false}
          onSetTime={() => {}}
        />
        {view.pair ? (
          <div className="pl-1">
            <p className="mb-1 text-[0.68rem] text-[#8E816D]">Peer partner</p>
            <StudentPersonRow person={view.pair.partner} />
          </div>
        ) : (
          <p className="text-[0.72rem] text-[#6B5E4C]">Pair: not paired yet</p>
        )}
        <MeetingTimeRow
          label="Group"
          anchorAt={view.groupAnchor}
          canManage={false}
          onSetTime={() => {}}
        />
      </div>
    </div>
  )
}
