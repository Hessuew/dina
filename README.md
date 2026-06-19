# TanStack Start - Christ-Dina

A TanStack Start example demonstrating integration with Supabase for authentication and database.

- [TanStack Router Docs](https://tanstack.com/router)
- [Supabase Documentation](https://supabase.com/docs)

## Start a new project based on this example

To start a new project based on this example, run:

```sh
npx gitpick TanStack/router/tree/main/examples/react/start-supabase-basic start-supabase-basic
```

## Setup

This example requires Supabase configuration. The `.env` file contains the necessary environment variables:

```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
```

You'll need to:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Update the `.env` file with your credentials

## Getting Started

From your terminal:

```sh
bun install
bun dev
```

This starts your app in development mode, rebuilding assets on file changes.

## Build

To build the app for production:

```sh
bun run build
```

## Supabase Integration

This example demonstrates:

- Authentication with Supabase Auth
- Database queries with Drizzle ORM
- Server-side data fetching
- Protected routes using root context

## Authentication Patterns

### Accessing User in Routes

The authenticated user is available in the root router context:

```typescript
export const Route = createFileRoute('/some-route')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw new Error('Not authenticated')
    }
    // User ID is available as context.user.id (Supabase UUID)
    // Email is available as context.user.email
  },
})
```

### Accessing User in Server Functions

In server functions, get the user from Supabase:

```typescript
const myServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Use user.id for database queries
  const profile = await getUserProfile(user.id)
  return profile
})
```

### Protected Routes

Use the `_authed` layout route to protect pages:

```typescript
// Routes under _authed/ require authentication
// The beforeLoad checks context.user and shows login if not authenticated
```

y
