import { DndContext, DragOverlay } from '@dnd-kit/core'
import { TeacherColumn } from './TeacherColumn'
import { UnassignedPool } from './UnassignedPool'
import { StudentCard } from './StudentCard'
import { ScheduleDialog } from './schedule-dialog/ScheduleDialog'
import { useDiscipleshipBoard } from './useDiscipleshipBoard'
import type {
  DiscipleshipBoardData,
  ScheduleTarget,
} from './useDiscipleshipBoard'
import type { ColumnHandlers } from './TeacherColumn'
import type { Board } from '@/utils/discipleship/domain/discipleship-board.domain'
import { buildBoard } from '@/utils/discipleship/domain/discipleship-board.domain'

function scheduleCopy(target: ScheduleTarget): {
  title: string
  subtitle: string
} {
  if (target.kind === 'individual') {
    return {
      title: '1-on-1 discipleship time',
      subtitle: 'Personal monthly meeting, recurring every 4 weeks.',
    }
  }
  if (target.kind === 'pair') {
    return {
      title: 'Pair discipleship time',
      subtitle: 'Pair monthly meeting, recurring every 4 weeks.',
    }
  }
  return {
    title: 'Group discipleship time',
    subtitle: 'All-disciples monthly meeting, recurring every 4 weeks.',
  }
}

function BoardLanes({
  board,
  data,
  handlers,
}: {
  board: Board
  data: DiscipleshipBoardData
  handlers: ColumnHandlers
}) {
  /* 13rem = topbar (4rem) + page-header (9rem) */
  return (
    <div className="flex flex-col gap-3 pb-4 md:h-[calc(100dvh-13rem)] md:flex-row md:items-stretch">
      <UnassignedPool students={board.unassigned} canManage />
      <div className="grid flex-1 content-start items-start gap-3 sm:grid-cols-1 md:min-h-0 md:grid-cols-2 md:overflow-y-auto lg:grid-cols-3">
        {board.columns.map((column) => (
          <TeacherColumn
            key={column.teacher.id}
            column={column}
            canManage={data.isAdmin || column.teacher.id === data.currentUserId}
            handlers={handlers}
          />
        ))}
      </div>
    </div>
  )
}

export function DiscipleshipBoard({ data }: { data: DiscipleshipBoardData }) {
  const {
    sensors,
    activeStudent,
    handleDragStart,
    handleDragEnd,
    handlers,
    scheduleTarget,
    closeSchedule,
    saveSchedule,
    isPending,
  } = useDiscipleshipBoard(data)

  const board = buildBoard(data)

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <BoardLanes board={board} data={data} handlers={handlers} />
        <DragOverlay>
          {activeStudent ? (
            <StudentCard student={activeStudent} canManage overlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {scheduleTarget && (
        <ScheduleDialog
          open
          onOpenChange={(next) => !next && closeSchedule()}
          title={scheduleCopy(scheduleTarget).title}
          subtitle={scheduleCopy(scheduleTarget).subtitle}
          initialAnchor={scheduleTarget.anchorAt}
          isSaving={isPending}
          onSave={saveSchedule}
        />
      )}
    </>
  )
}
