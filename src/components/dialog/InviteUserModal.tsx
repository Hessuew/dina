import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { toUserError } from '@/utils/errors'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMutation } from '@/hooks/useMutation'
import { createInvitation } from '@/utils/invitations'

type InviteUserModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function InviteUserModal({
  open,
  onOpenChange,
  onSuccess,
}: InviteUserModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'student' | 'teacher'>('student')

  const createInvitationFn = useServerFn(createInvitation)
  const inviteMutation = useMutation({
    fn: createInvitationFn,
    onSuccess: () => {
      toast.success(`Invitation sent to ${email}`)
      setEmail('')
      setRole('student')
      onOpenChange(false)
      onSuccess()
    },
    onError: (error) => {
      toast.error(toUserError(error).message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    inviteMutation.mutate({
      data: {
        email,
        role,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-none border border-white/10 text-[#F8F4EC] shadow-[0_42px_100px_-52px_rgba(0,0,0,0.82)] sm:max-w-lg"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(10,10,11,0.9), rgba(16,16,17,0.95)), url(${facultyBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        showCloseButton={false}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_38%,rgba(197,160,89,0.08)_100%)]" />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <div className="mb-1 flex items-start justify-between">
              <div>
                <div className="h-px w-8 bg-[#C5A059]/40" />
                <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#8E816D] uppercase">
                  User Management
                </div>
              </div>
              <Button
                variant="ghost"
                theme="dark"
                size="icon"
                className="shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
            <DialogTitle className="font-serif text-xl tracking-[-0.02em] text-[#F8F4EC]">
              Invite User
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <FieldGroup className="mt-6 gap-5">
                <Field>
                  <FieldLabel
                    htmlFor="email"
                    className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                  >
                    Email Address <span className="text-[#C5A059]">*</span>
                  </FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] placeholder:text-[#8E816D] focus:border-[#C5A059]/50"
                  />
                  <FieldDescription className="text-[#8E816D]">
                    The user will receive an invitation email with a
                    registration link
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor="role"
                    className="text-[0.68rem] font-medium tracking-[0.18em] text-[#9B7A41] uppercase"
                  >
                    Role
                  </FieldLabel>
                  <Select
                    value={role}
                    onValueChange={(value) =>
                      setRole(value as 'student' | 'teacher')
                    }
                  >
                    <SelectTrigger
                      id="role"
                      className="rounded-none border-white/12 bg-white/6 text-[#F8F4EC] focus:border-[#C5A059]/50"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-white/10 bg-[#1A1716] text-[#F8F4EC]">
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription className="text-[#8E816D]">
                    Select the role for the invited user
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </DialogBody>

            <DialogFooter className="mt-6 rounded-none border-t border-white/8 bg-white/3 pt-6">
              <Button
                type="button"
                variant="ghost"
                theme="dark"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                theme="dark"
                disabled={inviteMutation.status === 'pending'}
              >
                {inviteMutation.status === 'pending'
                  ? 'Sending...'
                  : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
