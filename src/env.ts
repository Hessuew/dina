import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'
import { env as _cfEnv } from 'cloudflare:workers'

const cfEnv = _cfEnv as any

export const env = createEnv({
  server: {
    SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    APP_URL: z.url(),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM: z.string().trim().min(1),
    WHATSAPP_ACCESS_TOKEN: z.string().min(1),
    WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
    WHATSAPP_API_VERSION: z.string().default('v21.0'),
    DATABASE_URL: z.string().optional(),
    BETTER_STACK_DSN: z.url().optional(),
  },
  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'VITE_',
  client: {
    VITE_SUPABASE_URL: z.url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1),
    VITE_GOOGLE_ADS_ID: z.string().min(1),
    VITE_META_PIXEL_ID: z.string().min(1),
    VITE_BETTER_STACK_DSN: z.url().optional(),
    VITE_SENTRY_DSN: z.url().optional(),
    VITE_POSTHOG_KEY: z.string().min(1).optional(),
    VITE_POSTHOG_HOST: z.url().optional(),
    VITE_BETTER_STACK_DASHBOARD_URL: z.url().optional(),
    VITE_CLOUDFLARE_DASHBOARD_URL: z.url().optional(),
    VITE_SUPABASE_DASHBOARD_URL: z.url().optional(),
    VITE_NOTION_OPERATIONS_URL: z.url().optional(),
  },
  /**
   * What object holds the environment variables at runtime. This is usually
   * `process.env` or `import.meta.env`.
   */
  runtimeEnv: {
    // Server-side variables from Cloudflare Workers env bindings
    SUPABASE_URL: cfEnv.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: cfEnv.SUPABASE_SERVICE_ROLE_KEY,
    APP_URL: cfEnv.APP_URL,
    RESEND_API_KEY: cfEnv.RESEND_API_KEY,
    RESEND_FROM: cfEnv.RESEND_FROM,
    WHATSAPP_ACCESS_TOKEN: cfEnv.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: cfEnv.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_API_VERSION: cfEnv.WHATSAPP_API_VERSION,
    BETTER_STACK_DSN: cfEnv.BETTER_STACK_DSN,
    // Client-side variables from import.meta.env
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_GOOGLE_ADS_ID: import.meta.env.VITE_GOOGLE_ADS_ID,
    VITE_META_PIXEL_ID: import.meta.env.VITE_META_PIXEL_ID,
    VITE_BETTER_STACK_DSN: import.meta.env.VITE_BETTER_STACK_DSN,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
    VITE_POSTHOG_HOST: import.meta.env.VITE_POSTHOG_HOST,
    VITE_BETTER_STACK_DASHBOARD_URL: import.meta.env
      .VITE_BETTER_STACK_DASHBOARD_URL,
    VITE_CLOUDFLARE_DASHBOARD_URL: import.meta.env
      .VITE_CLOUDFLARE_DASHBOARD_URL,
    VITE_SUPABASE_DASHBOARD_URL: import.meta.env.VITE_SUPABASE_DASHBOARD_URL,
    VITE_NOTION_OPERATIONS_URL: import.meta.env.VITE_NOTION_OPERATIONS_URL,
  },
  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in a ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,
})
