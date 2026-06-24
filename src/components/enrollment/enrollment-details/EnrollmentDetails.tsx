import type { ReactNode } from 'react'
import type { MaybeRedactedEnrollment } from '@/utils/enrolment/domain/enrolment.domain'
import { buildEnrollmentDetailsView } from '@/components/enrollment/enrollment-details/enrollment-details.domain'
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
  const view = buildEnrollmentDetailsView({ enrollment, isAdmin })

  const shortFields = (
    <>
      <div>
        <FieldLabel>Status</FieldLabel>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <EnrollmentStatusChip status={enrollment.status} />
          {statusAction}
        </div>
      </div>

      <Field label="Submitted">{view.submitted}</Field>

      <Field label="Preferred name">{view.preferredName}</Field>

      {view.showContact && <Field label="Email">{view.email}</Field>}

      {view.showContact && <Field label="WhatsApp">{view.whatsApp}</Field>}

      <Field label="Year of birth">{view.yearOfBirth}</Field>

      <Field label="Gender">{view.gender}</Field>

      <Field label="Nationality/citizenship">{view.nationality}</Field>

      <Field label="Current address">{view.address}</Field>

      <LongField label="Church affiliations">
        {view.churchAffiliations}
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
