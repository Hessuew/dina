import { createFileRoute, redirect } from '@tanstack/react-router'
import { EnrolmentForm } from '@/components/auth/enrolment-form/enrolment-form'
import { buildEnrolmentTrackingScripts } from '@/components/auth/enrolment-form/enrolment-form.domain'
import { env } from '@/env'

export const Route = createFileRoute('/enrolment')({
  beforeLoad: () => {
    throw redirect({ to: '/' })
  },
  component: EnrolmentComp,
  validateSearch: (search: Record<string, unknown>) => ({
    success:
      search.success === true || search.success === 'true' ? true : undefined,
  }),
  head: () => ({
    scripts: buildEnrolmentTrackingScripts({
      googleAdsId: env.VITE_GOOGLE_ADS_ID,
      metaPixelId: env.VITE_META_PIXEL_ID,
    }),
  }),
})

function EnrolmentComp() {
  const { success } = Route.useSearch()
  return <EnrolmentForm success={success} />
}
