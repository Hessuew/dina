Protect your client-side pages

To protect your pages on the client-side, you can use Clerk's prebuilt control components that control the visibility of content based on the user's authentication state.

The following example uses the following components:

    <Show when="signed-in">: Children of this component can only be seen while signed in.
    <Show when="signed-out">: Children of this component can only be seen while signed out.
    <UserButton />: Shows the signed-in user's avatar. Selecting it opens a dropdown menu with account management options.
    <SignInButton />: An unstyled component that links to the sign-in page or displays the sign-in modal. In this example, since no props or environment variables are set for the sign-in URL, this component links to the Account Portal sign-in page.
    <SignUpButton />: An unstyled component that links to the sign-up page or displays the sign-up modal. In this example, since no props or environment variables are set for the sign-up URL, this component links to the Account Portal sign-up page.

```typescript
import { UserButton, Show, SignInButton, SignUpButton } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div>
      <h1>Index Route</h1>
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton />
        <SignUpButton />
      </Show>
    </div>
  )
}
```

Protect your server-side routes

To protect your routes, create a server function that checks the user's authentication state via Clerk'sauth() method. If the user is not authenticated, they are redirected to a sign-in page. If authenticated, the user's userId is passed to the route, allowing access to the <Home /> component, which welcomes the user and displays their userId. ThebeforeLoad()method ensures authentication is checked before loading the page, and theloader()method returns the user data for use in the component.

Tip

Ensure that your app has the TanStack React Start server handler configured in order for your server routes to work.

```typescript
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'

const authStateFn = createServerFn().handler(async () => {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated) {
    // This will error because you're redirecting to a path that doesn't exist yet
    // You can create a sign-in route to handle this
    // See https://clerk.com/docs/tanstack-react-start/guides/development/custom-sign-in-or-up-page
    throw redirect({
      to: '/sign-in',
    })
  }

  return { userId }
})

export const Route = createFileRoute('/')({
  component: Home,
  beforeLoad: async () => await authStateFn(),
  loader: async ({ context }) => {
    return { userId: context.userId }
  },
})

function Home() {
  const state = Route.useLoaderData()

  return <h1>Welcome! Your ID is {state.userId}!</h1>
}
```
