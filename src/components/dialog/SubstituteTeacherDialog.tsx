import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { toast } from 'sonner'
import { toUserError } from '@/utils/errors'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAllTeachers } from '@/hooks/useAllTeachers'
import { useMutation } from '@/hooks/useMutation'
import {
  endSubstitution,
  getActiveSubstitutedTeacherIds,
  substituteTeacher,
} from '@/utils/enrolment'

type BaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function TeacherSelect({
  id,
  label,
  value,
  onChange,
  teachers,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  teachers: Array<{ id: string; fullName: string }>
  placeholder: string
}) {
  return (
    <Field>
      <FieldLabel
        htmlFor={id}
        className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
      >
        {label}
      </FieldLabel>
      <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
        <SelectTrigger
          id={id}
          className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-none border-white/10 bg-[#1A1716] text-[#F8F4EC]">
          {teachers.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.fullName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/**
 * Dialog for activating a teacher substitution. Inserts a course_substitutes
 * record and bulk-reassigns unscored assignments from the absent teacher to
 * the substitute.
 */
export function StartSubstitutionDialog({
  open,
  onOpenChange,
  onSuccess,
}: BaseDialogProps) {
  const [absentTeacherId, setAbsentTeacherId] = useState('')
  const [substituteTeacherId, setSubstituteTeacherId] = useState('')
  const { teachers } = useAllTeachers(open)

  const substituteTeacherFn = useServerFn(substituteTeacher)
  const mutation = useMutation({
    fn: substituteTeacherFn,
    onSuccess: (result) => {
      const count = result.data.reassigned
      const msg =
        count > 0
          ? `Substitution activated. ${count} assignment${count === 1 ? '' : 's'} reassigned.`
          : 'Substitution activated. No unscored assignments to reassign.'
      toast.success(msg)
      setAbsentTeacherId('')
      setSubstituteTeacherId('')
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(toUserError(error).message)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!absentTeacherId || !substituteTeacherId) return
    mutation.mutate({ data: { absentTeacherId, substituteTeacherId } })
  }

  const availableSubstitutes = teachers.filter((t) => t.id !== absentTeacherId)

  function handleOpenChange(next: boolean) {
    if (!next) {
      setAbsentTeacherId('')
      setSubstituteTeacherId('')
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-[-0.01em]">
            Substitute Teacher
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="pt-4">
            <FieldGroup className="gap-6">
              <TeacherSelect
                id="absent-teacher"
                label="Absent Teacher"
                value={absentTeacherId}
                onChange={setAbsentTeacherId}
                teachers={teachers}
                placeholder="Select absent teacher"
              />
              <TeacherSelect
                id="substitute-teacher"
                label="Substitute Teacher"
                value={substituteTeacherId}
                onChange={setSubstituteTeacherId}
                teachers={availableSubstitutes}
                placeholder="Select substitute teacher"
              />
            </FieldGroup>
          </DialogBody>
          <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
            <Button
              type="button"
              variant="ghost"
              theme="dark"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              theme="dark"
              disabled={
                mutation.isPending || !absentTeacherId || !substituteTeacherId
              }
            >
              {mutation.isPending ? 'Saving...' : 'Activate Substitution'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Dialog for ending an active substitution. Removes the course_substitutes
 * record for the selected absent teacher. Only teachers with an active
 * substitution are shown.
 */
export function EndSubstitutionDialog({
  open,
  onOpenChange,
  onSuccess,
}: BaseDialogProps) {
  const [absentTeacherId, setAbsentTeacherId] = useState('')
  const [activeAbsentIds, setActiveAbsentIds] = useState<Array<string>>([])
  const { teachers } = useAllTeachers(open)
  const getActiveSubstitutedTeacherIdsFn = useServerFn(
    getActiveSubstitutedTeacherIds,
  )

  useEffect(() => {
    if (!open) return
    getActiveSubstitutedTeacherIdsFn().then((r) =>
      setActiveAbsentIds(r.teacherIds),
    )
  }, [open, getActiveSubstitutedTeacherIdsFn])

  const absentTeachers = teachers.filter((t) => activeAbsentIds.includes(t.id))

  const endSubstitutionFn = useServerFn(endSubstitution)
  const mutation = useMutation({
    fn: endSubstitutionFn,
    onSuccess: () => {
      toast.success('Substitution ended.')
      setAbsentTeacherId('')
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(toUserError(error).message)
    },
  })

  function handleOpenChange(next: boolean) {
    if (!next) setAbsentTeacherId('')
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!absentTeacherId) return
    mutation.mutate({ data: { absentTeacherId } })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-[-0.01em]">
            End Substitution
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="pt-4">
            <FieldGroup>
              <TeacherSelect
                id="absent-teacher-end"
                label="Absent Teacher"
                value={absentTeacherId}
                onChange={setAbsentTeacherId}
                teachers={absentTeachers}
                placeholder="Select absent teacher"
              />
            </FieldGroup>
          </DialogBody>
          <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
            <Button
              type="button"
              variant="ghost"
              theme="dark"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              theme="dark"
              disabled={mutation.isPending || !absentTeacherId}
            >
              {mutation.isPending ? 'Saving...' : 'End Substitution'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
