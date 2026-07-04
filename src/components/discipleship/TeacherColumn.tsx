import { useDroppable } from '@dnd-kit/core'
import { PairRow } from './PairRow'
import { StudentCard } from './StudentCard'
import { MeetingTimeRow } from './MeetingTimeRow'
import type { BoardColumn } from '@/utils/discipleship/domain/discipleship-board.domain'
import { cn } from '@/lib/utils'

export type ColumnHandlers = {
  onSetGroupTime: (teacherId: string) => void
  onSetPairTime: (pairId: string) => void
  onSetIndividual: (studentId: string, anchorAt: string | null) => void
  onUnpair: (studentId: string) => void
}

type TeacherColumnProps = {
  column: BoardColumn
  canManage: boolean
  handlers: ColumnHandlers
}

export function TeacherColumn({
  column,
  canManage,
  handlers,
}: TeacherColumnProps) {
  const { teacher } = column
  const { setNodeRef, isOver } = useDroppable({
    id: `teacher-${teacher.id}`,
    data: { kind: 'teacher', teacherId: teacher.id },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-black/10 bg-white/60 p-3',
        isOver && 'ring-2 ring-[#C5A059]/70',
      )}
    >
      <div className="border-b border-black/8 pb-2">
        <p className="font-serif text-sm font-semibold text-[#2B2417]">
          {teacher.fullName}
        </p>
        <div className="mt-1">
          <MeetingTimeRow
            label="Group"
            anchorAt={column.groupAnchor}
            canManage={canManage}
            onSetTime={() => handlers.onSetGroupTime(teacher.id)}
          />
        </div>
      </div>

      {column.pairs.map((pairView) => (
        <PairRow
          key={pairView.pair.id}
          pairView={pairView}
          canManage={canManage}
          onSetPairTime={handlers.onSetPairTime}
          onSetIndividual={handlers.onSetIndividual}
          onUnpair={handlers.onUnpair}
        />
      ))}

      {column.solo.map((member) => (
        <StudentCard
          key={member.student.id}
          student={member.student}
          canManage={canManage}
          individualAnchor={member.assignment.anchorAt}
          onSetIndividual={() =>
            handlers.onSetIndividual(member.student.id, member.assignment.anchorAt)
          }
          pairDropTarget={{
            kind: 'student',
            studentId: member.student.id,
            teacherId: teacher.id,
          }}
        />
      ))}

      {column.pairs.length === 0 && column.solo.length === 0 && (
        <p className="px-1 py-4 text-center text-[0.78rem] text-[#9B8A73]">
          Drop a student here
        </p>
      )}
    </div>
  )
}
