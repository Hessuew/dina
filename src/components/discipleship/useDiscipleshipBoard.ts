import { useCallback, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { toast } from 'sonner'
import type { ColumnHandlers } from './TeacherColumn'
import {
  assignStudentToTeacher,
  pairStudents,
  setGroupSchedule,
  setIndividualSchedule,
  setPairSchedule,
  unassignStudent,
  unpairStudent,
} from '@/utils/discipleship/discipleship'
import { resolveDropIntent } from '@/utils/discipleship/domain/discipleship-drop.domain'
import type {
  DragSource,
  DropIntent,
  DropTarget,
} from '@/utils/discipleship/domain/discipleship-drop.domain'
import type {
  BoardAssignment,
  BoardGroup,
  BoardPair,
  BoardStudent,
  BoardTeacher,
} from '@/utils/discipleship/domain/discipleship-board.domain'
import { toUserError } from '@/utils/errors'

export type DiscipleshipBoardData = {
  isAdmin: boolean
  currentUserId: string
  teachers: Array<BoardTeacher>
  students: Array<BoardStudent>
  assignments: Array<BoardAssignment>
  pairs: Array<BoardPair>
  groups: Array<BoardGroup>
}

export type ScheduleTarget =
  | { kind: 'individual'; studentId: string; anchorAt: string | null }
  | { kind: 'pair'; pairId: string; anchorAt: string | null }
  | { kind: 'group'; teacherId: string; anchorAt: string | null }

function useRunner() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setIsPending(true)
      try {
        await action()
        await router.invalidate()
      } catch (error) {
        toast.error(toUserError(error).message)
      } finally {
        setIsPending(false)
      }
    },
    [router],
  )
  return { isPending, run }
}

function useMutations() {
  return {
    assign: useServerFn(assignStudentToTeacher),
    unassign: useServerFn(unassignStudent),
    pair: useServerFn(pairStudents),
    unpair: useServerFn(unpairStudent),
    setIndividual: useServerFn(setIndividualSchedule),
    setPair: useServerFn(setPairSchedule),
    setGroup: useServerFn(setGroupSchedule),
  }
}

type Mutations = ReturnType<typeof useMutations>

function useDnd(
  students: Array<BoardStudent>,
  mutations: Mutations,
  run: (action: () => Promise<unknown>) => Promise<void>,
) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  function dispatch(intent: DropIntent) {
    if (intent.type === 'assign') {
      const { studentId, teacherId } = intent
      void run(() => mutations.assign({ data: { studentId, teacherId } }))
    } else if (intent.type === 'unassign') {
      void run(() =>
        mutations.unassign({ data: { studentId: intent.studentId } }),
      )
    } else if (intent.type === 'pair') {
      const { studentIdA, studentIdB, teacherId } = intent
      void run(() =>
        mutations.pair({ data: { studentIdA, studentIdB, teacherId } }),
      )
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(
      (event.active.data.current as DragSource | undefined)?.studentId ?? null,
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const source = event.active.data.current as DragSource | undefined
    const target = (event.over?.data.current as DropTarget | undefined) ?? null
    if (source) dispatch(resolveDropIntent(source, target))
  }

  const activeStudent = students.find((s) => s.id === activeId) ?? null
  return { sensors, activeStudent, handleDragStart, handleDragEnd }
}

function useScheduleController(
  data: DiscipleshipBoardData,
  mutations: Mutations,
  run: (action: () => Promise<unknown>) => Promise<void>,
) {
  const [target, setTarget] = useState<ScheduleTarget | null>(null)

  const handlers: ColumnHandlers = {
    onSetIndividual: (studentId, anchorAt) =>
      setTarget({ kind: 'individual', studentId, anchorAt }),
    onSetPairTime: (pairId) =>
      setTarget({
        kind: 'pair',
        pairId,
        anchorAt: data.pairs.find((p) => p.id === pairId)?.anchorAt ?? null,
      }),
    onSetGroupTime: (teacherId) =>
      setTarget({
        kind: 'group',
        teacherId,
        anchorAt:
          data.groups.find((g) => g.teacherId === teacherId)?.anchorAt ?? null,
      }),
    onUnpair: (studentId) =>
      void run(() => mutations.unpair({ data: { studentId } })),
  }

  function submit(anchorAt: Date) {
    if (target?.kind === 'individual') {
      return mutations.setIndividual({
        data: { studentId: target.studentId, anchorAt },
      })
    }
    if (target?.kind === 'pair') {
      return mutations.setPair({ data: { pairId: target.pairId, anchorAt } })
    }
    if (target?.kind !== 'group') return Promise.resolve()
    return mutations.setGroup({
      data: { teacherId: target.teacherId, anchorAt },
    })
  }

  async function saveSchedule(anchorAt: Date) {
    await run(() => submit(anchorAt))
    setTarget(null)
  }

  return {
    scheduleTarget: target,
    closeSchedule: () => setTarget(null),
    saveSchedule,
    handlers,
  }
}

export function useDiscipleshipBoard(data: DiscipleshipBoardData) {
  const { isPending, run } = useRunner()
  const mutations = useMutations()
  const dnd = useDnd(data.students, mutations, run)
  const schedule = useScheduleController(data, mutations, run)
  return { ...dnd, ...schedule, isPending }
}
