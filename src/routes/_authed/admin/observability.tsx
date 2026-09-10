import { createFileRoute } from '@tanstack/react-router'
import { Activity, Cloud, Database, ExternalLink, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { PageLayout } from '@/components/layout/page-layout'
import { checkAdminAccess } from '@/utils/auth/admin'
import { env } from '@/env'

type DashboardLink = {
  title: string
  description: string
  href?: string
  icon: LucideIcon
}

const dashboardLinks: Array<DashboardLink> = [
  {
    title: 'Better Stack',
    description: 'Errors, Logs & Traces, Uptime, and alert delivery.',
    href: env.VITE_BETTER_STACK_DASHBOARD_URL,
    icon: Activity,
  },
  {
    title: 'Cloudflare',
    description: 'Worker traffic, status codes, latency, logs, and traces.',
    href: env.VITE_CLOUDFLARE_DASHBOARD_URL,
    icon: Cloud,
  },
  {
    title: 'Supabase',
    description: 'Postgres health, connection pressure, and backups.',
    href: env.VITE_SUPABASE_DASHBOARD_URL,
    icon: Database,
  },
  {
    title: 'Operations in Notion',
    description: 'Runbooks, SLOs, incidents, risks, and roadmap status.',
    href: env.VITE_NOTION_OPERATIONS_URL,
    icon: FileText,
  },
]

export const Route = createFileRoute('/_authed/admin/observability')({
  beforeLoad: async () => {
    await checkAdminAccess()
  },
  component: ObservabilityPage,
})

function ObservabilityPage() {
  return (
    <PageLayout>
      <div className="mb-10">
        <div className="h-px w-10 bg-[#C5A059]/50" />
        <h1 className="mt-3 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
          Observability
        </h1>
        <p className="mt-2 max-w-2xl text-[0.72rem] font-medium tracking-[0.16em] text-[#8E816D] uppercase">
          Production signals and operating surfaces
        </p>
      </div>

      <section className="border border-[#1A1A1A]/10 bg-white/60 p-5 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.08)] sm:p-7">
        <div className="mb-6 flex flex-col gap-2 border-b border-[#1A1A1A]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
              Operator surface
            </div>
            <h2 className="mt-2 font-serif text-2xl tracking-[-0.02em] text-[#1C1815]">
              Production overview
            </h2>
          </div>
          <p className="text-xs tracking-[0.08em] text-[#8E816D]">
            Links are configured per deployment environment.
          </p>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {dashboardLinks.map((dashboard) => (
            <DashboardCard key={dashboard.title} dashboard={dashboard} />
          ))}
        </div>
      </section>

      <section className="mt-6 border-l-2 border-[#C5A059]/40 bg-[#F8F4EC]/70 px-5 py-4 sm:px-6">
        <div className="text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
          Current signal contract
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#4E463D]">
          Better Stack is the operator-facing replacement for Sentry. The app
          emits redacted, request-correlated events, while Cloudflare remains
          the Worker telemetry source and Better Stack Uptime watches
          <code className="mx-1 text-xs">/healthz</code> and
          <code className="mx-1 text-xs">/readyz</code>.
        </p>
      </section>
    </PageLayout>
  )
}

function DashboardCard({ dashboard }: { dashboard: DashboardLink }) {
  const Icon = dashboard.icon

  return (
    <article className="flex min-w-0 items-start gap-4 border border-[#1A1A1A]/10 bg-[#FCFBF8]/80 p-5 transition-colors hover:border-[#C5A059]/35">
      <div className="flex size-10 shrink-0 items-center justify-center border border-[#C5A059]/30 bg-[#1A1716] text-[#E9D9B4]">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-xl text-[#1C1815]">{dashboard.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#5E5549]">
          {dashboard.description}
        </p>
        {dashboard.href ? (
          <a
            className="mt-4 inline-flex items-center gap-2 text-[0.68rem] font-medium tracking-[0.2em] text-[#9B7A41] uppercase transition-colors hover:text-[#6e562d]"
            href={dashboard.href}
            target="_blank"
            rel="noreferrer"
          >
            Open dashboard
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : (
          <span className="mt-4 inline-flex text-[0.68rem] font-medium tracking-[0.2em] text-[#AFA28F] uppercase">
            URL not configured
          </span>
        )}
      </div>
    </article>
  )
}
