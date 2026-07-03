import { useDroppable } from '@dnd-kit/core'
import { StudentCard } from './StudentCard'
import type { BoardStudent } from '@/utils/discipleship/domain/discipleship-board.domain'
import { cn } from '@/lib/utils'

type UnassignedPoolProps = {
  students: Array<BoardStudent>
  canManage: boolean
}

export function UnassignedPool({ students, canManage }: UnassignedPoolProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'pool',
    data: { kind: 'pool' },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-full flex-col gap-2 rounded-xl border border-dashed border-black/15 bg-white/40 p-3 md:h-full md:w-72 md:min-h-0 md:shrink-0',
        isOver && 'ring-2 ring-[#C5A059]/70',
      )}
    >
      <p className="border-b border-black/8 pb-2 text-[0.68rem] font-medium tracking-[0.2em] text-[#8E816D] uppercase">
        Unassigned · {students.length}
      </p>
      <div className="flex flex-col gap-2 md:min-h-0 md:flex-1 md:overflow-y-auto">
        {students.map((student) => (
          <StudentCard
            key={student.id}
            student={student}
            canManage={canManage}
          />
        ))}
        {students.length === 0 && (
          <p className="px-1 py-4 text-center text-[0.78rem] text-[#9B8A73]">
            Everyone is assigned
          </p>
        )}
      </div>
    </div>
  )
}
