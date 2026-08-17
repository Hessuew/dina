import { useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import type { StaffPrivilege } from '@/utils/staff-privilege/domain/staff-privilege.domain'
import type { Role } from '@/utils/authz/types'
import { Switch } from '@/components/ui/switch'
import { toUserError } from '@/utils/errors'
import {
  STAFF_PRIVILEGES,
  STAFF_PRIVILEGE_LABELS,
  canShowStaffPrivilegePanel,
  shouldApplyPrivilegePersist,
} from '@/utils/staff-privilege/domain/staff-privilege.domain'
import { setStaffPrivilege } from '@/utils/staff-privilege'

type TeacherPrivilegePanelProps = {
  teacherId: string
  role: Role | undefined
  privileges: Array<StaffPrivilege>
  isAdmin: boolean
}

export function TeacherPrivilegePanel({
  teacherId,
  role,
  privileges,
  isAdmin,
}: TeacherPrivilegePanelProps) {
  const currentTeacherIdRef = useRef(teacherId)
  currentTeacherIdRef.current = teacherId

  if (!canShowStaffPrivilegePanel(isAdmin, role ?? null)) return null

  return (
    <div className="mt-8 border-t border-white/8 pt-6">
      <div className="h-px w-12 bg-[#C5A059]/50" />
      <h3 className="mt-4 text-[0.68rem] font-medium tracking-[0.3em] text-[#D4B373] uppercase">
        Staff Privileges
      </h3>
      <div className="mt-4 space-y-3">
        {STAFF_PRIVILEGES.map((privilege) => (
          <PrivilegeToggle
            key={`${teacherId}-${privilege}`}
            teacherId={teacherId}
            privilege={privilege}
            checked={privileges.includes(privilege)}
            isCurrent={() =>
              shouldApplyPrivilegePersist(
                teacherId,
                currentTeacherIdRef.current,
              )
            }
          />
        ))}
      </div>
    </div>
  )
}

function PrivilegeToggle({
  teacherId,
  privilege,
  checked,
  isCurrent,
}: {
  teacherId: string
  privilege: StaffPrivilege
  checked: boolean
  isCurrent: () => boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  return (
    <label className="flex items-center justify-between gap-4 text-sm text-[#D8D0C7]">
      <span>{STAFF_PRIVILEGE_LABELS[privilege]}</span>
      <Switch
        checked={checked}
        disabled={busy}
        onCheckedChange={(next) => {
          void persistPrivilege({
            teacherId,
            privilege,
            granted: next,
            setBusy,
            isCurrent,
            refresh: () => router.invalidate(),
          })
        }}
      />
    </label>
  )
}

async function persistPrivilege(args: {
  teacherId: string
  privilege: StaffPrivilege
  granted: boolean
  setBusy: (busy: boolean) => void
  isCurrent: () => boolean
  refresh: () => Promise<unknown>
}) {
  args.setBusy(true)
  try {
    await setStaffPrivilege({
      data: {
        userId: args.teacherId,
        privilege: args.privilege,
        granted: args.granted,
      },
    })
    await args.refresh()
  } catch (error) {
    if (args.isCurrent()) toast.error(toUserError(error).message)
  } finally {
    if (args.isCurrent()) args.setBusy(false)
  }
}
