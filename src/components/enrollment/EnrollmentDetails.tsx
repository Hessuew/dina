import { format } from 'date-fns'
import type { ReactNode } from 'react'
import type { MaybeRedactedEnrollment } from '@/utils/enrolment/domain/enrolment.domain'
import { EnrollmentStatusChip } from '@/components/table/chips'

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2 text-sm text-[#D6CCBE]">{children}</div>
    </div>
  )
}

function LongField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="sm:col-span-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-2 text-sm leading-7 whitespace-pre-wrap text-[#D6CCBE]">
        {children}
      </div>
    </div>
  )
}

/**
 * Read-only field grid for a single enrollment application.
 * Shared by the detail route and the evaluation review overlay.
 * `statusAction` lets the detail page slot in its admin status control.
 */
export function EnrollmentDetails({
  enrollment,
  isAdmin,
  statusAction,
  essaysAside = false,
}: {
  enrollment: MaybeRedactedEnrollment
  isAdmin: boolean
  statusAction?: ReactNode
  essaysAside?: boolean
}) {
  const address = [enrollment.currentCity, enrollment.currentCountry]
    .filter(Boolean)
    .join(', ')

  const shortFields = (
    <>
      <div>
        <FieldLabel>Status</FieldLabel>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <EnrollmentStatusChip status={enrollment.status} />
          {statusAction}
        </div>
      </div>

      <Field label="Submitted">
        {format(new Date(enrollment.createdAt), 'MMM d, yyyy')}
      </Field>

      <Field label="Preferred name">{enrollment.preferredName || '—'}</Field>

      {isAdmin && <Field label="Email">{enrollment.email}</Field>}

      {isAdmin && <Field label="WhatsApp">{enrollment.phoneWhatsApp}</Field>}

      <Field label="Year of birth">{enrollment.yearOfBirth}</Field>

      <Field label="Gender">
        {enrollment.gender === 'male' ? 'Male' : 'Female'}
      </Field>

      <Field label="Nationality/citizenship">
        {enrollment.nationalityCitizenship || '—'}
      </Field>

      <Field label="Current address">{address || '—'}</Field>

      <LongField label="Church affiliations">
        {enrollment.churchAffiliations || '—'}
      </LongField>
    </>
  )

  const essays = (
    <>
      <LongField label="About">{enrollment.aboutYourself}</LongField>

      <LongField label="Expectations">
        {enrollment.expectationsAlignment}
      </LongField>
    </>
  )

  return (
    <div className="border border-white/10 bg-[#151515]/88 p-6 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
      {essaysAside ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="grid gap-6 sm:grid-cols-2">{shortFields}</div>
          <div className="space-y-6">{essays}</div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {shortFields}
          {essays}
        </div>
      )}
    </div>
  )
}
