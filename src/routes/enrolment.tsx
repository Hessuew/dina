import { createFileRoute } from '@tanstack/react-router'
import { EnrolmentForm } from '@/components/auth/enrolment-form'
import { env } from '@/env'

export const Route = createFileRoute('/enrolment')({
  component: EnrolmentComp,
  validateSearch: (search: Record<string, unknown>) => ({
    success:
      search.success === true || search.success === 'true' ? true : undefined,
  }),
  head: () => ({
    scripts: [
      {
        src: `https://www.googletagmanager.com/gtag/js?id=${env.VITE_GOOGLE_ADS_ID}`,
        async: true,
      },
      {
        children: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${env.VITE_GOOGLE_ADS_ID}');
        `,
      },
    ],
  }),
})

function EnrolmentComp() {
  const { success } = Route.useSearch()
  return <EnrolmentForm success={success} />
}
