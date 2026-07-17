import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  DEVELOPMENT_STORAGE_BUCKETS,
  MAX_USER_LIST_PAGES,
  USERS_PER_PAGE,
  bucketsToEnsure,
  isUserListPageExhausted,
  resolveUserPageScan,
} from './seed-development.domain'
import type { SupabaseClient, User } from '@supabase/supabase-js'

config({ path: ['.env.local', '.env'] })

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PRODUCTION_PROJECT_REF',
  'DEVELOPMENT_SEED_EMAIL',
  'DEVELOPMENT_SEED_PASSWORD',
] as const

type SeedProfile = {
  id: string
  email: string
  full_name: string
  role: 'admin'
}

type DevelopmentDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: SeedProfile
        Insert: SeedProfile
        Update: Partial<SeedProfile>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

type AdminClient = SupabaseClient<DevelopmentDatabase>

function requireEnv(name: (typeof REQUIRED_ENV)[number]): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function projectRef(url: string): string {
  const host = new URL(url).hostname
  const ref = host.endsWith('.supabase.co') ? host.split('.')[0] : undefined
  if (!ref)
    throw new Error('SUPABASE_URL must be a hosted Supabase project URL')
  return ref
}

function loadDevelopmentConfig() {
  for (const name of REQUIRED_ENV) requireEnv(name)
  if (process.env.SUPABASE_ENVIRONMENT !== 'development') {
    throw new Error('Refusing to seed unless SUPABASE_ENVIRONMENT=development')
  }

  const url = requireEnv('SUPABASE_URL')
  if (projectRef(url) === requireEnv('SUPABASE_PRODUCTION_PROJECT_REF')) {
    throw new Error('Refusing to seed the production Supabase project')
  }

  return {
    url,
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    email: requireEnv('DEVELOPMENT_SEED_EMAIL'),
    password: requireEnv('DEVELOPMENT_SEED_PASSWORD'),
  }
}

async function listAuthUsersPage(
  supabase: AdminClient,
  page: number,
): Promise<Array<User>> {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage: USERS_PER_PAGE,
  })
  if (error) throw error
  return data.users
}

async function findUserByEmail(supabase: AdminClient, email: string) {
  for (let page = 1; !isUserListPageExhausted(page); page += 1) {
    const scan = resolveUserPageScan(
      await listAuthUsersPage(supabase, page),
      email,
    )
    if (scan.done) return scan.user
  }
  throw new Error(
    `Development user lookup exceeded ${MAX_USER_LIST_PAGES * USERS_PER_PAGE} users`,
  )
}

async function ensureDevelopmentAdmin(
  supabase: AdminClient,
  email: string,
  password: string,
) {
  const existing = await findUserByEmail(supabase, email)
  const attributes = {
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Development Admin' },
  }
  const result = existing
    ? await supabase.auth.admin.updateUserById(existing.id, attributes)
    : await supabase.auth.admin.createUser({ email, ...attributes })

  if (result.error) throw result.error
  const user = result.data.user
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email,
    full_name: 'Development Admin',
    role: 'admin',
  })
  if (error) throw error
}

async function upsertStorageBucket(
  supabase: AdminClient,
  bucket: { id: string; public: boolean },
  exists: boolean,
) {
  const result = exists
    ? await supabase.storage.updateBucket(bucket.id, { public: bucket.public })
    : await supabase.storage.createBucket(bucket.id, { public: bucket.public })
  if (result.error) throw result.error
}

async function ensureStorageBuckets(supabase: AdminClient) {
  const { data: existing, error } = await supabase.storage.listBuckets()
  if (error) throw error
  const plan = bucketsToEnsure(
    existing.map((bucket) => bucket.id),
    DEVELOPMENT_STORAGE_BUCKETS,
  )
  for (const bucket of plan.update) {
    await upsertStorageBucket(supabase, bucket, true)
  }
  for (const bucket of plan.create) {
    await upsertStorageBucket(supabase, bucket, false)
  }
}

async function main() {
  const settings = loadDevelopmentConfig()
  const supabase = createClient<DevelopmentDatabase>(
    settings.url,
    settings.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  await ensureDevelopmentAdmin(supabase, settings.email, settings.password)
  await ensureStorageBuckets(supabase)
  console.log('Development Auth user, profile, and Storage buckets are ready')
}

await main()
