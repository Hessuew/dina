import { createFileRoute, redirect } from '@tanstack/react-router'
import { EnrolmentForm } from '@/components/auth/enrolment-form'
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
      {
        children: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${env.VITE_META_PIXEL_ID}');
          fbq('track', 'PageView');
        `,
      },
    ],
  }),
})

function EnrolmentComp() {
  const { success } = Route.useSearch()
  return <EnrolmentForm success={success} />
}
