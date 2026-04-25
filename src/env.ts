import { createEnv } from '@t3-oss/env-core'
import { env as cfEnv } from 'cloudflare:workers'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    APP_URL: z.url().optional(),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM_EMAIL: z.email(),
  },
  /**
   * The prefix that client-side variables must have. This is enforced both at
   * a type-level and at runtime.
   */
  clientPrefix: 'VITE_',
  client: {
    VITE_APP_TITLE: z.string().min(1).optional(),
    VITE_SUPABASE_URL: z.url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1),
  },
  /**
   * What object holds the environment variables at runtime. This is usually
   * `process.env` or `import.meta.env`.
   */
  runtimeEnv: {
    // Server-side variables from Cloudflare Workers env bindings
    SUPABASE_URL: cfEnv.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: cfEnv.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: cfEnv.DATABASE_URL,
    APP_URL: cfEnv.APP_URL,
    RESEND_API_KEY: cfEnv.RESEND_API_KEY,
    RESEND_FROM_EMAIL: cfEnv.RESEND_FROM_EMAIL,
    // Client-side variables from import.meta.env
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
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
