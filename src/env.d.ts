/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Client-side environment variables
  readonly VITE_APP_TITLE: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Server-side environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV: 'development' | 'production' | 'test'
      readonly SUPABASE_URL: string
      readonly SUPABASE_SERVICE_ROLE_KEY: string
      readonly APP_URL: string
      readonly RESEND_API_KEY: string
      readonly RESEND_FROM_EMAIL: string
    }
  }
}

export {}
