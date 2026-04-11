import { createFileRoute } from '@tanstack/react-router'
import { EnrolmentForm } from '@/components/enrolment-form'

export const Route = createFileRoute('/enrolment')({
  component: EnrolmentComp,
})

function EnrolmentComp() {
  return <EnrolmentForm />
}
