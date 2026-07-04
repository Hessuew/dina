// Test stand-in for `@/env`. The integration config aliases the exact specifier
// `@/env` here so importing a service doesn't pull in `src/env.ts`, which both
// imports `cloudflare:workers` and runs t3-env validation that requires real
// secrets. Integration tests exercise the DB path, not Supabase/Resend config,
// so dummy values are sufficient.
// NOTE: Must remain exported - services import env from '@/env' (e.g., enrolment.service.ts)
export const env = {
  SUPABASE_URL: 'http://localhost',
  SUPABASE_SERVICE_ROLE_KEY: 'test',
  APP_URL: 'http://localhost',
  RESEND_API_KEY: 'test',
  RESEND_FROM_EMAIL: 'test@test.dev',
  WHATSAPP_ACCESS_TOKEN: 'test',
  WHATSAPP_PHONE_NUMBER_ID: 'test',
  WHATSAPP_API_VERSION: 'v21.0',
  DATABASE_URL: 'pglite://memory',
  VITE_SUPABASE_URL: 'http://localhost',
  VITE_SUPABASE_ANON_KEY: 'test',
  VITE_GOOGLE_ADS_ID: 'test',
  VITE_META_PIXEL_ID: 'test',
}
