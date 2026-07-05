import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: ['.env.local', '.env'] })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Drizzle config')
}

// Note: We use Supabase for authentication and handle authorization in application code
// RLS policies are disabled - authorization checks are done in server functions and route handlers
export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
})
